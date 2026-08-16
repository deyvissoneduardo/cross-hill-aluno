/**
 * Porta de dados da feature "Agendamento do cliente sem conta" + implementação Firestore.
 *
 * Fonte de verdade: `docs/specs/features/agendamento-cliente/v1/tech_spec.md` (§7.4, §8.3, §8.4).
 * Termo canônico "Solicitação de Agendamento": `docs/specs/domain-glossary.md`.
 *
 * `AgendamentoStore` separa a porta de domínio (consumida por Route Handlers) da
 * implementação Firestore (`FirestoreAgendamentoStore`) — Route Handlers dependem apenas das
 * funções exportadas abaixo, nunca do SDK Firestore diretamente. Testes usam um fake
 * transacional determinístico que implementa a MESMA interface `AgendamentoStore` (ver
 * `agendamentoStore.test.ts`), sem depender de Firestore real nem de corrida temporal frágil.
 * Consequência conhecida: a lógica de `FirestoreAgendamentoStore` NÃO tem cobertura de execução
 * real — leia a "NOTA TÉCNICA" no JSDoc dessa classe antes de alterá-la.
 *
 * Concorrência (§8.3): `criarSolicitacaoAgendamento` roda dentro de uma transação Firestore.
 * O bloqueio transacional obrigatório é (a) elegibilidade do horário — o `profissionalId` existe e
 * `disponibilidades/{profissionalId}_{data}` tem `ativo == true` com `dto.horario` em `horarios[]`
 * (o endpoint público não tem autenticação, então a elegibilidade nunca é presumida da consulta
 * anterior da UI), (b) duplicidade diária do mesmo `telefoneNormalizado`
 * (`AGUARDANDO_CONFIRMACAO`|`CONFIRMADO` contam como ativa; `CANCELADO` não conta) e (c) slot
 * já `CONFIRMADO`. Solicitações `AGUARDANDO_CONFIRMACAO` de clientes DIFERENTES no mesmo
 * `profissionalId`+`data`+`horario` NÃO bloqueiam — a confirmação de apenas uma fica a cargo do
 * admin, fora desta feature. Se qualquer regra falhar, a transação lança ANTES de qualquer
 * escrita — nenhum documento parcial é criado.
 *
 * Privacidade: nenhum retorno público (`SolicitacaoAgendamentoDTO`, `Profissional`,
 * `DiaDisponivel`, `HorarioDisponivel`, `ConfiguracaoSucesso`) ou erro tipado carrega nome,
 * telefone ou identificador de outra Solicitação de Agendamento concorrente.
 */

import 'server-only'

import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import type {
  ConfiguracaoSucesso,
  CriarSolicitacaoAgendamentoDTO,
  DiaDisponivel,
  HorarioDisponivel,
  Profissional,
  SolicitacaoAgendamentoDTO,
  StatusSolicitacaoAgendamento,
} from '@/app/agendamento/types'
import { getFirebaseAdminApp } from './admin'

const NOME_COLECAO_PROFISSIONAIS = 'profissionais'
const NOME_COLECAO_DISPONIBILIDADES = 'disponibilidades'
const NOME_COLECAO_AGENDAMENTOS = 'agendamentos'
const NOME_COLECAO_CONFIGURACOES = 'configuracoes'
const ID_DOCUMENTO_CONFIGURACAO_SUCESSO = 'sucessoPublico'

/**
 * Status que contam como Solicitação de Agendamento ATIVA no dia para a regra de duplicidade
 * (RN-09/CA-09/CA-12). `CANCELADO` deliberadamente NÃO está nesta lista (RN-10/CA-10).
 */
export const STATUS_SOLICITACAO_ATIVOS: readonly StatusSolicitacaoAgendamento[] = [
  'AGUARDANDO_CONFIRMACAO',
  'CONFIRMADO',
]

/** Textos de fallback seguro para a tela de sucesso quando a configuração está ausente/inválida (RN-14). */
export const CONFIGURACAO_SUCESSO_FALLBACK: ConfiguracaoSucesso = {
  titulo: 'Solicitação enviada',
  descricao: 'Sua solicitação de agendamento foi registrada e aguarda confirmação.',
  regras: [],
  dicas: [],
  avisos: ['O horário só é considerado definitivo após a confirmação.'],
}

/** Id do documento `disponibilidades/{profissionalId}_{data}` (tech_spec.md §7.4). */
function idDocumentoDisponibilidade(profissionalId: string, data: string): string {
  return `${profissionalId}_${data}`
}

/**
 * Formata a data (`YYYY-MM-DD`) em rótulo de exibição pt-BR (ex.: "Qui, 20/08").
 * Compartilhado entre `FirestoreAgendamentoStore` e o fake de teste para que as duas
 * implementações da porta produzam o mesmo formato de `DiaDisponivel.label`.
 */
export function formatarLabelDia(data: string): string {
  const referencia = new Date(`${data}T00:00:00`)
  const diaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(referencia)
    .replace(/\.$/, '')
  const diaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(
    referencia
  )
  return `${diaSemana.charAt(0).toUpperCase()}${diaSemana.slice(1)}, ${diaMes}`
}

/**
 * Erro de domínio tipado: o horário pedido não pode receber a Solicitação de Agendamento porque
 * (a) não é elegível — profissional inexistente, dia com `ativo == false` ou horário fora de
 * `horarios[]` (§8.3) — ou (b) o slot (`profissionalId`+`data`+`horario`) já tem uma Solicitação de
 * Agendamento `CONFIRMADO` (RN-06/CA-06/CA-12). As duas causas compartilham deliberadamente o
 * mesmo código e a mesma mensagem: o cliente vê "não está mais disponível" sem descobrir se o
 * administrador desativou o dia, removeu o horário ou confirmou outra pessoa. Mensagem e campos
 * nunca carregam nome, telefone ou identificador de Solicitação de Agendamento de terceiro.
 */
export class SlotIndisponivelError extends Error {
  readonly codigo = 'SLOT_INDISPONIVEL' as const

  constructor() {
    super('Este horário não está mais disponível.')
    this.name = 'SlotIndisponivelError'
  }
}

/**
 * Erro de domínio tipado: `telefoneNormalizado` já possui Solicitação de Agendamento ativa
 * (`AGUARDANDO_CONFIRMACAO`|`CONFIRMADO`) no mesmo dia (RN-09/CA-09/CA-12). Mensagem e campos
 * nunca carregam dados da Solicitação de Agendamento conflitante além do próprio motivo.
 */
export class TelefoneDuplicadoNoDiaError extends Error {
  readonly codigo = 'TELEFONE_DUPLICADO_NO_DIA' as const

  constructor() {
    super('Você já possui uma solicitação de agendamento para este dia.')
    this.name = 'TelefoneDuplicadoNoDiaError'
  }
}

/**
 * Porta de domínio da feature de agendamento (tech_spec.md §8.4). `FirestoreAgendamentoStore`
 * é a implementação real; testes usam um fake determinístico que implementa a MESMA interface
 * — nenhum método adicional é exposto só para o fake funcionar.
 */
export interface AgendamentoStore {
  /** Profissionais com `ativo == true`, mapeados para o formato público (tech_spec.md §7.4). */
  listarProfissionaisAtivos(): Promise<Profissional[]>
  /**
   * Dias com disponibilidade `ativo == true` para o profissional informado, ordenados por `data`
   * ascendente (a query Firestore não garante ordem — a implementação ordena explicitamente).
   */
  listarDiasLiberados(profissionalId: string): Promise<DiaDisponivel[]>
  /**
   * Horários liberados no dia que ainda não estão `CONFIRMADO`. Horários com Solicitações de
   * Agendamento `AGUARDANDO_CONFIRMACAO` de terceiros continuam elegíveis (RN-07/CA-07/CA-15).
   */
  listarHorariosElegiveis(profissionalId: string, data: string): Promise<HorarioDisponivel[]>
  /**
   * Cria a Solicitação de Agendamento dentro de uma operação atômica (§8.3), revalidando a
   * elegibilidade do horário na própria operação. Lança `SlotIndisponivelError` (horário
   * inelegível ou slot já `CONFIRMADO`) ou `TelefoneDuplicadoNoDiaError` sem criar documento algum
   * quando uma regra falha — nunca há escrita parcial.
   */
  criarSolicitacaoAgendamento(dto: CriarSolicitacaoAgendamentoDTO): Promise<SolicitacaoAgendamentoDTO>
  /** Textos públicos da tela de sucesso, com fallback seguro (RN-14). */
  carregarConfiguracaoSucesso(): Promise<ConfiguracaoSucesso>
}

/**
 * Implementação Firestore da porta `AgendamentoStore`, usando `getFirebaseAdminApp()` (T3).
 *
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * NOTA TÉCNICA — LACUNA DE COBERTURA CONHECIDA (débito consciente, não esquecimento)
 * ────────────────────────────────────────────────────────────────────────────────────────────
 *
 * **O QUE NÃO ESTÁ COBERTO.** Nenhum teste automatizado executa os métodos desta classe. A
 * suíte `agendamentoStore.test.ts` valida a porta (`AgendamentoStore`) através de um fake
 * transacional in-memory: os casos CT-014, CT-025 e CT-026 e o cenário `SLOT_INDISPONIVEL`
 * exercitam `FakeAgendamentoStore`, não `FirestoreAgendamentoStore`. Deste arquivo, apenas os
 * símbolos puros importados pelos testes (`formatarLabelDia`, `STATUS_SOLICITACAO_ATIVOS`,
 * `CONFIGURACAO_SUCESSO_FALLBACK`, `SlotIndisponivelError`, `TelefoneDuplicadoNoDiaError`) e o
 * contrato de tipos da interface têm cobertura real. Isso NÃO é um adaptador burro: a elegibilidade
 * do horário (§8.3), a RN-06 (slot já `CONFIRMADO`) e a RN-09 (`telefoneNormalizado` duplicado no
 * dia) estão reimplementadas aqui em sintaxe Firestore, e essa segunda implementação nunca roda em
 * teste.
 *
 * **POR QUE.** Executar esta classe exige um Firestore real ou emulado, e o projeto não tem
 * infraestrutura de emulador hoje: não existe `firebase.json`, `firestore.rules`, `.firebaserc`,
 * nem `@firebase/rules-unit-testing`/`firebase-tools` em `devDependencies` (`firebase-admin` é
 * dependency de produção). Introduzir emulador implica devDependency nova, arquivos de
 * configuração na raiz, portas reservadas e um passo de CI — mudança de infraestrutura de
 * projeto desproporcional ao escopo desta task (que declara apenas `agendamentoStore.ts` e
 * `agendamentoStore.test.ts`) e que, feita às pressas dentro dela, ficaria sem os cuidados que
 * uma decisão de infraestrutura de teste merece. Optou-se por registrar o trade-off aqui, de
 * forma explícita e localizada no código exposto ao risco, em vez de deixá-lo implícito.
 *
 * **RISCO CONCRETO ACEITO.** Um bug introduzido SÓ nesta classe passa 100% verde na suíte atual.
 * Exemplos realistas, todos invisíveis aos testes de hoje:
 *  - operador de query trocado em `criarSolicitacaoAgendamento` (`'in'` → `'=='` em
 *    `STATUS_SOLICITACAO_ATIVOS`, ou `'=='` → `'!='`) — a checagem de duplicidade deixa de
 *    bloquear (RN-09 furada) ou passa a bloquear tudo;
 *  - campo errado na comparação (`telefoneExibicao` em vez de `telefoneNormalizado`,
 *    `criadoEm` em vez de `data`) — duplicidade escapa por variação de formatação do telefone;
 *  - id do documento de disponibilidade montado errado (ordem `data_profissionalId`, separador
 *    diferente) ou `ativo`/`horarios` lidos de campo inexistente — a checagem de elegibilidade
 *    passaria a recusar TODA criação (ou, se invertida, a aceitar horário nunca liberado);
 *  - `'CONFIRMADO'` trocado por `'AGUARDANDO_CONFIRMACAO'` no filtro de slot — slots com
 *    pendências de terceiros passariam a ser recusados, violando RN-07/CA-15;
 *  - ordem leitura/escrita dentro de `runTransaction` invertida (qualquer `transaction.get`
 *    movido para depois do `transaction.set`) — o Firestore rejeita a transação em runtime, algo
 *    que nem o compilador nem o fake detectam;
 *  - `transaction.set` promovido a escrita fora da transação (`ref.set`) — reintroduz a janela
 *    de corrida que §8.3 existe para fechar.
 * Enquanto a lacuna existir, mudanças nesta classe pedem revisão humana atenta e verificação
 * manual contra um projeto Firestore de desenvolvimento; testes verdes não são evidência de que
 * ela funciona.
 *
 * **PLANO DE MITIGAÇÃO.** Quando o projeto configurar emulador Firestore (candidato natural a
 * task/ADR de infraestrutura de teste próprio), adicionar testes de integração que espelhem
 * CT-014, CT-025 e CT-026 — mais o cenário `SLOT_INDISPONIVEL` — executando contra
 * `FirestoreAgendamentoStore` real apontada ao emulador, e então remover esta nota. Os casos já
 * estão escritos de forma agnóstica de implementação (semeiam estado, chamam a porta, asseveram
 * o retorno público e a ausência de escrita parcial), portanto a migração é reescrever o setup
 * de seed em documentos Firestore, não redesenhar os casos.
 * ────────────────────────────────────────────────────────────────────────────────────────────
 */
export class FirestoreAgendamentoStore implements AgendamentoStore {
  private firestore() {
    return getFirestore(getFirebaseAdminApp())
  }

  async listarProfissionaisAtivos(): Promise<Profissional[]> {
    const snapshot = await this.firestore()
      .collection(NOME_COLECAO_PROFISSIONAIS)
      .where('ativo', '==', true)
      .get()

    return snapshot.docs.map((doc) => {
      const dados = doc.data() as { nome: string; cref: string }
      return { id: doc.id, nome: dados.nome, cref: dados.cref }
    })
  }

  async listarDiasLiberados(profissionalId: string): Promise<DiaDisponivel[]> {
    const snapshot = await this.firestore()
      .collection(NOME_COLECAO_DISPONIBILIDADES)
      .where('profissionalId', '==', profissionalId)
      .where('ativo', '==', true)
      .get()

    return snapshot.docs
      .map((doc) => (doc.data() as { data: string }).data)
      .sort((a, b) => a.localeCompare(b))
      .map((data) => ({ data, label: formatarLabelDia(data) }))
  }

  async listarHorariosElegiveis(profissionalId: string, data: string): Promise<HorarioDisponivel[]> {
    const firestore = this.firestore()

    const disponibilidadeSnap = await firestore
      .collection(NOME_COLECAO_DISPONIBILIDADES)
      .doc(idDocumentoDisponibilidade(profissionalId, data))
      .get()
    const disponibilidade = disponibilidadeSnap.data() as
      | { horarios: string[]; ativo: boolean }
      | undefined

    if (!disponibilidade || !disponibilidade.ativo) {
      return []
    }

    const confirmadosSnap = await firestore
      .collection(NOME_COLECAO_AGENDAMENTOS)
      .where('profissionalId', '==', profissionalId)
      .where('data', '==', data)
      .where('status', '==', 'CONFIRMADO' satisfies StatusSolicitacaoAgendamento)
      .get()
    const horariosConfirmados = new Set(
      confirmadosSnap.docs.map((doc) => (doc.data() as { horario: string }).horario)
    )

    return disponibilidade.horarios
      .filter((horario) => !horariosConfirmados.has(horario))
      .map((horario) => ({ horario }))
  }

  async carregarConfiguracaoSucesso(): Promise<ConfiguracaoSucesso> {
    try {
      const snapshot = await this.firestore()
        .collection(NOME_COLECAO_CONFIGURACOES)
        .doc(ID_DOCUMENTO_CONFIGURACAO_SUCESSO)
        .get()

      if (!snapshot.exists) {
        return CONFIGURACAO_SUCESSO_FALLBACK
      }

      const dados = snapshot.data() as Partial<ConfiguracaoSucesso> | undefined
      if (!dados?.titulo || !dados.descricao) {
        return CONFIGURACAO_SUCESSO_FALLBACK
      }

      return {
        titulo: dados.titulo,
        descricao: dados.descricao,
        regras: dados.regras ?? [],
        dicas: dados.dicas ?? [],
        avisos: dados.avisos ?? [],
      }
    } catch (erro) {
      // Erro de leitura (rede, permissão, documento corrompido) usa o fallback seguro em vez de
      // propagar — a tela de sucesso nunca pode ficar bloqueada por configuração de texto. O log
      // evita que a falha fique invisível (o projeto ainda não tem logger estruturado); nada do
      // erro chega ao cliente, que recebe apenas os textos de fallback.
      console.error(
        `[agendamentoStore] falha ao ler ${NOME_COLECAO_CONFIGURACOES}/${ID_DOCUMENTO_CONFIGURACAO_SUCESSO}; usando fallback`,
        erro
      )
      return CONFIGURACAO_SUCESSO_FALLBACK
    }
  }

  async criarSolicitacaoAgendamento(
    dto: CriarSolicitacaoAgendamentoDTO
  ): Promise<SolicitacaoAgendamentoDTO> {
    const firestore = this.firestore()
    const novoDocumentoRef = firestore.collection(NOME_COLECAO_AGENDAMENTOS).doc()

    return firestore.runTransaction(async (transaction) => {
      const profissionalRef = firestore.collection(NOME_COLECAO_PROFISSIONAIS).doc(dto.profissionalId)
      const disponibilidadeRef = firestore
        .collection(NOME_COLECAO_DISPONIBILIDADES)
        .doc(idDocumentoDisponibilidade(dto.profissionalId, dto.data))
      const slotConfirmadoQuery = firestore
        .collection(NOME_COLECAO_AGENDAMENTOS)
        .where('profissionalId', '==', dto.profissionalId)
        .where('data', '==', dto.data)
        .where('horario', '==', dto.horario)
        .where('status', '==', 'CONFIRMADO' satisfies StatusSolicitacaoAgendamento)
        .limit(1)
      const telefoneDuplicadoQuery = firestore
        .collection(NOME_COLECAO_AGENDAMENTOS)
        .where('telefoneNormalizado', '==', dto.telefoneNormalizado)
        .where('data', '==', dto.data)
        .where('status', 'in', STATUS_SOLICITACAO_ATIVOS)
        .limit(1)

      // Transações Firestore exigem que TODAS as leituras ocorram antes de qualquer escrita —
      // por isso as quatro leituras abaixo rodam concorrentemente e só depois vem o `transaction.set`.
      const [profissionalSnap, disponibilidadeSnap, slotConfirmadoSnap, telefoneDuplicadoSnap] =
        await Promise.all([
          transaction.get(profissionalRef),
          transaction.get(disponibilidadeRef),
          transaction.get(slotConfirmadoQuery),
          transaction.get(telefoneDuplicadoQuery),
        ])

      // Elegibilidade (§8.3): o endpoint público não tem autenticação, então o horário é
      // reconferido contra a disponibilidade dentro da MESMA transação — checar fora reabriria a
      // janela em que o administrador desativa o dia entre a leitura e a escrita.
      // `data()` de documento inexistente é `undefined`; os campos são opcionais no tipo porque o
      // documento Firestore pode estar incompleto — daí a checagem em vez de fallback silencioso.
      const profissionalDados = profissionalSnap.data() as { nome?: string } | undefined
      const disponibilidade = disponibilidadeSnap.data() as
        | { horarios?: string[]; ativo?: boolean }
        | undefined
      const horarioElegivel =
        disponibilidade?.ativo === true && (disponibilidade.horarios ?? []).includes(dto.horario)
      if (!profissionalDados?.nome || !horarioElegivel) {
        throw new SlotIndisponivelError()
      }
      if (!slotConfirmadoSnap.empty) {
        throw new SlotIndisponivelError()
      }
      if (!telefoneDuplicadoSnap.empty) {
        throw new TelefoneDuplicadoNoDiaError()
      }

      const status: StatusSolicitacaoAgendamento = 'AGUARDANDO_CONFIRMACAO'

      transaction.set(novoDocumentoRef, {
        nomeCliente: dto.nomeCliente,
        telefoneExibicao: dto.telefoneExibicao,
        telefoneNormalizado: dto.telefoneNormalizado,
        profissionalId: dto.profissionalId,
        data: dto.data,
        horario: dto.horario,
        status,
        criadoEm: FieldValue.serverTimestamp(),
      })

      return {
        id: novoDocumentoRef.id,
        status,
        profissionalNome: profissionalDados.nome,
        data: dto.data,
        horario: dto.horario,
      }
    })
  }
}

let storeSingleton: AgendamentoStore | undefined

function getStore(): AgendamentoStore {
  if (!storeSingleton) {
    storeSingleton = new FirestoreAgendamentoStore()
  }
  return storeSingleton
}

/** Funções da porta consumidas por Route Handlers (tech_spec.md §8.4) — nunca Firestore direto. */
export function listarProfissionaisAtivos(): Promise<Profissional[]> {
  return getStore().listarProfissionaisAtivos()
}

export function listarDiasLiberados(profissionalId: string): Promise<DiaDisponivel[]> {
  return getStore().listarDiasLiberados(profissionalId)
}

export function listarHorariosElegiveis(
  profissionalId: string,
  data: string
): Promise<HorarioDisponivel[]> {
  return getStore().listarHorariosElegiveis(profissionalId, data)
}

export function criarSolicitacaoAgendamento(
  dto: CriarSolicitacaoAgendamentoDTO
): Promise<SolicitacaoAgendamentoDTO> {
  return getStore().criarSolicitacaoAgendamento(dto)
}

export function carregarConfiguracaoSucesso(): Promise<ConfiguracaoSucesso> {
  return getStore().carregarConfiguracaoSucesso()
}
