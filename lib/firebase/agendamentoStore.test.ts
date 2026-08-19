// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type {
  ConfiguracaoSucesso,
  CriarSolicitacaoAgendamentoDTO,
  DiaDisponivel,
  HorarioDisponivel,
  Profissional,
  SolicitacaoAgendamentoDTO,
  StatusSolicitacaoAgendamento,
} from '@/app/agendamento/types'
import {
  CONFIGURACAO_SUCESSO_FALLBACK,
  FirestoreAgendamentoStore,
  SlotIndisponivelError,
  STATUS_SOLICITACAO_ATIVOS,
  TelefoneDuplicadoNoDiaError,
  formatarLabelDia,
  slotEstaDisponivel,
  type AgendamentoStore,
} from './agendamentoStore'

describe('slotEstaDisponivel', () => {
  it.each([
    ['liberado e sem agendamento', { liberado: true, agendamentoId: null }, true],
    ['já reservado', { liberado: true, agendamentoId: 'agendamento-1' }, false],
    ['bloqueado por liberado', { liberado: false, agendamentoId: null }, false],
    ['sem a flag liberado', { agendamentoId: null }, false],
    ['sem campos obrigatórios', {}, false],
  ])('CT-036: %s', (_cenario, slot, esperado) => {
    expect(slotEstaDisponivel(slot)).toBe(esperado)
  })
})

/**
 * Emula a camada de servidor do Next.js para o marcador `server-only` (mesma justificativa de
 * `lib/firebase/admin.test.ts`): `agendamentoStore.ts` importa `import 'server-only'` e
 * `./admin`, então o runner do Vitest (sem a condição `react-server`) cairia no entrypoint que
 * lança no client. Mockar para módulo vazio reproduz o `empty.js` que o Next.js usa no servidor.
 * `vi.mock` é hoisted pelo Vitest para antes de qualquer import do arquivo, então a posição
 * textual abaixo dos imports estáticos não afeta a ordem real de execução.
 */
vi.mock('server-only', () => ({}))

/**
 * Espião do SDK Firestore, usado APENAS pelos testes do guard de id de documento no fim deste
 * arquivo: eles precisam provar que `FirestoreAgendamentoStore` recusa um id inendereçável ANTES
 * de tocar o SDK, e isso só é observável a partir da classe real. Nenhum outro teste deste arquivo
 * toca o SDK (todos usam `FakeAgendamentoStore` ou símbolos puros), então o mock é inerte para
 * eles. Não existe símbolo test-only em produção: os testes entram pela interface pública da
 * classe exportada.
 */
const { getFirestore } = vi.hoisted(() => ({ getFirestore: vi.fn() }))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore,
  FieldValue: { serverTimestamp: () => 'server-timestamp' },
}))

vi.mock('./admin', () => ({ getFirebaseAdminApp: () => ({}) }))

/**
 * Fake transacional determinístico da porta `AgendamentoStore` (Iron Law #6 / §3 da task):
 * implementa a MESMA interface pública da implementação Firestore, sem expor nenhum
 * método/estado interno que a implementação real não teria. Vive neste arquivo de teste — não
 * em `agendamentoStore.ts` — porque é a exceção prevista pela própria task ("fake transacional
 * em arquivo de teste ou helper interno de teste"). Como JavaScript é single-threaded e
 * `criarSolicitacaoAgendamento` não faz nenhum `await` entre a validação e a escrita, a
 * validação e a mutação do array interno são atômicas por construção — reproduzindo a garantia
 * de "nenhuma escrita parcial" da transação Firestore real sem depender de timing.
 */
interface FakeProfissionalSeed {
  id: string
  nome: string
  cref: string
  ativo: boolean
}

interface FakeDisponibilidadeSeed {
  profissionalId: string
  data: string
  horarios: string[]
  ativo: boolean
}

interface FakeAgendamentoSeed {
  id: string
  nomeCliente: string
  telefoneExibicao: string
  telefoneNormalizado: string
  profissionalId: string
  data: string
  horario: string
  status: StatusSolicitacaoAgendamento
}

interface FakeAgendamentoStoreSeed {
  profissionais?: FakeProfissionalSeed[]
  disponibilidades?: FakeDisponibilidadeSeed[]
  agendamentos?: FakeAgendamentoSeed[]
  configuracaoSucesso?: ConfiguracaoSucesso
}

class FakeAgendamentoStore implements AgendamentoStore {
  private readonly profissionais: FakeProfissionalSeed[]
  private readonly disponibilidades: FakeDisponibilidadeSeed[]
  private readonly agendamentos: FakeAgendamentoSeed[]
  private readonly configuracaoSucesso: ConfiguracaoSucesso
  private contadorId = 0

  constructor(seed: FakeAgendamentoStoreSeed = {}) {
    this.profissionais = seed.profissionais ? [...seed.profissionais] : []
    this.disponibilidades = seed.disponibilidades ? [...seed.disponibilidades] : []
    this.agendamentos = seed.agendamentos ? [...seed.agendamentos] : []
    this.configuracaoSucesso = seed.configuracaoSucesso ?? CONFIGURACAO_SUCESSO_FALLBACK
  }

  async listarProfissionaisAtivos(): Promise<Profissional[]> {
    return this.profissionais
      .filter((profissional) => profissional.ativo)
      .map(({ id, nome, cref }) => ({ id, nome, cref }))
  }

  async listarDiasLiberados(profissionalId: string): Promise<DiaDisponivel[]> {
    return this.disponibilidades
      .filter((dia) => dia.profissionalId === profissionalId && dia.ativo)
      .map((dia) => dia.data)
      .sort((a, b) => a.localeCompare(b))
      .map((data) => ({ data, label: formatarLabelDia(data) }))
  }

  async listarHorariosElegiveis(profissionalId: string, data: string): Promise<HorarioDisponivel[]> {
    const disponibilidade = this.disponibilidades.find(
      (dia) => dia.profissionalId === profissionalId && dia.data === data && dia.ativo
    )
    if (!disponibilidade) return []

    const horariosConfirmados = new Set(
      this.agendamentos
        .filter(
          (agendamento) =>
            agendamento.profissionalId === profissionalId &&
            agendamento.data === data &&
            agendamento.status === 'CONFIRMADO'
        )
        .map((agendamento) => agendamento.horario)
    )

    return disponibilidade.horarios
      .filter((horario) => !horariosConfirmados.has(horario))
      .map((horario) => ({ horario }))
  }

  async carregarConfiguracaoSucesso(): Promise<ConfiguracaoSucesso> {
    return this.configuracaoSucesso
  }

  async criarSolicitacaoAgendamento(
    dto: CriarSolicitacaoAgendamentoDTO
  ): Promise<SolicitacaoAgendamentoDTO> {
    // Espelha as leituras que a transação Firestore faz antes de qualquer escrita.
    const profissional = this.profissionais.find((item) => item.id === dto.profissionalId)
    const disponibilidade = this.disponibilidades.find(
      (dia) => dia.profissionalId === dto.profissionalId && dia.data === dto.data
    )
    const horarioElegivel =
      disponibilidade?.ativo === true && disponibilidade.horarios.includes(dto.horario)
    if (!profissional || !horarioElegivel) {
      throw new SlotIndisponivelError()
    }

    const slotJaConfirmado = this.agendamentos.some(
      (agendamento) =>
        agendamento.profissionalId === dto.profissionalId &&
        agendamento.data === dto.data &&
        agendamento.horario === dto.horario &&
        agendamento.status === 'CONFIRMADO'
    )
    if (slotJaConfirmado) {
      throw new SlotIndisponivelError()
    }

    const telefoneJaAtivoNoDia = this.agendamentos.some(
      (agendamento) =>
        agendamento.telefoneNormalizado === dto.telefoneNormalizado &&
        agendamento.data === dto.data &&
        (STATUS_SOLICITACAO_ATIVOS as readonly string[]).includes(agendamento.status)
    )
    if (telefoneJaAtivoNoDia) {
      throw new TelefoneDuplicadoNoDiaError()
    }

    const novaSolicitacao: FakeAgendamentoSeed = {
      id: `fake-sol-${++this.contadorId}`,
      nomeCliente: dto.nomeCliente,
      telefoneExibicao: dto.telefoneExibicao,
      telefoneNormalizado: dto.telefoneNormalizado,
      profissionalId: dto.profissionalId,
      data: dto.data,
      horario: dto.horario,
      status: 'AGUARDANDO_CONFIRMACAO',
    }
    this.agendamentos.push(novaSolicitacao)

    return {
      id: novaSolicitacao.id,
      status: novaSolicitacao.status,
      profissionalNome: profissional.nome,
      data: dto.data,
      horario: dto.horario,
    }
  }

  /** Helper só de teste (fora da interface `AgendamentoStore`): prova ausência de escrita parcial. */
  contarAgendamentos(): number {
    return this.agendamentos.length
  }
}

const PROFISSIONAL_SEED: FakeProfissionalSeed = {
  id: 'prof-1',
  nome: 'Dra. Ana',
  cref: '123456-G/SP',
  ativo: true,
}

/**
 * Disponibilidade liberada usada pelos testes de criação: sem um dia `ativo` contendo o horário
 * pedido, `criarSolicitacaoAgendamento` recusa a criação por inelegibilidade (§8.3), então todo
 * caminho felizes/negativo de OUTRA regra precisa semear a elegibilidade explicitamente.
 */
const DISPONIBILIDADE_SEED: FakeDisponibilidadeSeed = {
  profissionalId: 'prof-1',
  data: '2026-08-20',
  horarios: ['09:00', '10:00', '11:00'],
  ativo: true,
}

const DTO_BASE: CriarSolicitacaoAgendamentoDTO = {
  nomeCliente: 'Maria Souza',
  telefoneNormalizado: '5511999998888',
  telefoneExibicao: '(11) 99999-8888',
  profissionalId: 'prof-1',
  data: '2026-08-20',
  horario: '09:00',
}

describe('agendamentoStore — criarSolicitacaoAgendamento (fake transacional)', () => {
  it('CT-014: allows_after_cancelled_request (CA-10)', async () => {
    // INVARIANT: status CANCELADO não conta como Solicitação de Agendamento ativa no dia —
    // o mesmo telefone pode criar nova solicitação no mesmo dia se a anterior foi cancelada.
    const store = new FakeAgendamentoStore({
      profissionais: [PROFISSIONAL_SEED],
      disponibilidades: [DISPONIBILIDADE_SEED],
      agendamentos: [
        {
          id: 'sol-cancelada',
          nomeCliente: DTO_BASE.nomeCliente,
          telefoneExibicao: DTO_BASE.telefoneExibicao,
          telefoneNormalizado: DTO_BASE.telefoneNormalizado,
          profissionalId: DTO_BASE.profissionalId,
          data: DTO_BASE.data,
          horario: '09:00',
          status: 'CANCELADO',
        },
      ],
    })

    const resultado = await store.criarSolicitacaoAgendamento({ ...DTO_BASE, horario: '10:00' })

    expect(resultado).toEqual({
      id: expect.any(String),
      status: 'AGUARDANDO_CONFIRMACAO',
      profissionalNome: 'Dra. Ana',
      data: '2026-08-20',
      horario: '10:00',
    })
    expect(store.contarAgendamentos()).toBe(2)
  })

  it('CT-025: store_transaction_blocks_same_phone_same_day (CA-09, CA-12) — negative companion de CT-014', async () => {
    // INVARIANT: o mesmo telefoneNormalizado não pode ter duas Solicitações de Agendamento
    // ativas no mesmo dia; a tentativa de duplicidade não cria nenhum documento (sem escrita parcial).
    const store = new FakeAgendamentoStore({
      profissionais: [PROFISSIONAL_SEED],
      disponibilidades: [DISPONIBILIDADE_SEED],
    })

    const primeira = await store.criarSolicitacaoAgendamento(DTO_BASE)
    expect(primeira.status).toBe('AGUARDANDO_CONFIRMACAO')

    const erro = await store
      .criarSolicitacaoAgendamento({ ...DTO_BASE, horario: '11:00' })
      .catch((erroCapturado: unknown) => erroCapturado)

    expect(erro).toBeInstanceOf(TelefoneDuplicadoNoDiaError)
    expect((erro as InstanceType<typeof TelefoneDuplicadoNoDiaError>).codigo).toBe(
      'TELEFONE_DUPLICADO_NO_DIA'
    )
    // Nenhuma escrita parcial: só a primeira solicitação foi persistida.
    expect(store.contarAgendamentos()).toBe(1)
  })

  it('CT-026: store_transaction_allows_pending_same_slot_for_different_clients (CA-07, CA-15)', async () => {
    // INVARIANT: Solicitações de Agendamento AGUARDANDO_CONFIRMACAO de clientes DIFERENTES
    // podem coexistir no mesmo profissionalId+data+horario; o retorno público de uma criação
    // nunca carrega nome/telefone/id da Solicitação de Agendamento do outro cliente.
    const store = new FakeAgendamentoStore({
      profissionais: [PROFISSIONAL_SEED],
      disponibilidades: [
        { profissionalId: 'prof-1', data: '2026-08-20', horarios: ['09:00'], ativo: true },
      ],
    })

    const resultado1 = await store.criarSolicitacaoAgendamento(DTO_BASE)
    const resultado2 = await store.criarSolicitacaoAgendamento({
      nomeCliente: 'João Pereira',
      telefoneNormalizado: '5521988887777',
      telefoneExibicao: '(21) 98888-7777',
      profissionalId: 'prof-1',
      data: '2026-08-20',
      horario: '09:00',
    })

    expect(resultado1.status).toBe('AGUARDANDO_CONFIRMACAO')
    expect(resultado2.status).toBe('AGUARDANDO_CONFIRMACAO')
    expect(resultado1.id).not.toBe(resultado2.id)

    // Contrato literal do retorno público: só estas 5 chaves, nenhum dado do outro solicitante.
    expect(Object.keys(resultado2).sort()).toEqual([
      'data',
      'horario',
      'id',
      'profissionalNome',
      'status',
    ])
    const superficieDoRetorno = JSON.stringify(resultado2)
    expect(superficieDoRetorno).not.toContain(DTO_BASE.nomeCliente)
    expect(superficieDoRetorno).not.toContain(DTO_BASE.telefoneNormalizado)
    expect(superficieDoRetorno).not.toContain(DTO_BASE.telefoneExibicao)
    expect(store.contarAgendamentos()).toBe(2)
  })

  it('Cenário de Erro: rejeita criação com SLOT_INDISPONIVEL quando o slot já está CONFIRMADO (CA-06, CA-12) — negative companion de CT-026', async () => {
    const store = new FakeAgendamentoStore({
      profissionais: [PROFISSIONAL_SEED],
      disponibilidades: [DISPONIBILIDADE_SEED],
      agendamentos: [
        {
          id: 'sol-confirmada',
          nomeCliente: 'Carlos Terceiro',
          telefoneExibicao: '(31) 97777-6666',
          telefoneNormalizado: '5531977776666',
          profissionalId: 'prof-1',
          data: '2026-08-20',
          horario: '09:00',
          status: 'CONFIRMADO',
        },
      ],
    })

    const erro = await store.criarSolicitacaoAgendamento(DTO_BASE).catch((erroCapturado: unknown) => erroCapturado)

    expect(erro).toBeInstanceOf(SlotIndisponivelError)
    expect((erro as InstanceType<typeof SlotIndisponivelError>).codigo).toBe('SLOT_INDISPONIVEL')
    // Erro tipado não carrega nome/telefone do terceiro cuja Solicitação de Agendamento confirmada bloqueou o slot.
    const erroComoTexto = (erro as Error).message
    expect(erroComoTexto).not.toContain('Carlos Terceiro')
    expect(erroComoTexto).not.toContain('5531977776666')
    // Nenhuma escrita parcial: só a solicitação confirmada pré-existente permanece.
    expect(store.contarAgendamentos()).toBe(1)
  })

  it('Cenário de Erro: rejeita horário que não pertence a nenhuma disponibilidade ativa (elegibilidade, §8.3)', async () => {
    // INVARIANT: o endpoint público não tem autenticação, então a elegibilidade do horário é
    // revalidada na própria criação — só é elegível o horário presente em `horarios[]` de uma
    // disponibilidade com `ativo == true` para aquele profissional+data. Nem o dia desativado
    // pelo administrador nem um horário nunca liberado podem virar Solicitação de Agendamento.
    const store = new FakeAgendamentoStore({
      profissionais: [PROFISSIONAL_SEED],
      disponibilidades: [
        { profissionalId: 'prof-1', data: '2026-08-20', horarios: ['09:00'], ativo: false },
        { profissionalId: 'prof-1', data: '2026-08-21', horarios: ['09:00'], ativo: true },
      ],
    })

    // (a) dia existe, mas está desativado (ativo == false).
    const erroDiaInativo = await store
      .criarSolicitacaoAgendamento(DTO_BASE)
      .catch((erroCapturado: unknown) => erroCapturado)

    expect(erroDiaInativo).toBeInstanceOf(SlotIndisponivelError)
    expect((erroDiaInativo as InstanceType<typeof SlotIndisponivelError>).codigo).toBe(
      'SLOT_INDISPONIVEL'
    )

    // (b) dia ativo, mas o horário pedido não está na lista de horários liberados.
    const erroHorarioNaoLiberado = await store
      .criarSolicitacaoAgendamento({ ...DTO_BASE, data: '2026-08-21', horario: '17:00' })
      .catch((erroCapturado: unknown) => erroCapturado)

    expect(erroHorarioNaoLiberado).toBeInstanceOf(SlotIndisponivelError)
    expect((erroHorarioNaoLiberado as InstanceType<typeof SlotIndisponivelError>).codigo).toBe(
      'SLOT_INDISPONIVEL'
    )

    // (c) data sem nenhum documento de disponibilidade.
    const erroDiaInexistente = await store
      .criarSolicitacaoAgendamento({ ...DTO_BASE, data: '2026-08-22' })
      .catch((erroCapturado: unknown) => erroCapturado)

    expect(erroDiaInexistente).toBeInstanceOf(SlotIndisponivelError)

    // A mensagem genérica não revela a razão administrativa (dia desativado, horário removido).
    expect((erroDiaInativo as Error).message).toBe('Este horário não está mais disponível.')
    // Nenhuma escrita parcial em nenhuma das três tentativas.
    expect(store.contarAgendamentos()).toBe(0)
  })

  it('Cenário de Erro: rejeita criação para profissional inexistente', async () => {
    // INVARIANT: sem o profissional, não há elegibilidade a confirmar — a criação falha em vez de
    // gravar uma Solicitação de Agendamento órfã com `profissionalNome` vazio.
    const store = new FakeAgendamentoStore({
      profissionais: [PROFISSIONAL_SEED],
      disponibilidades: [
        { profissionalId: 'prof-fantasma', data: '2026-08-20', horarios: ['09:00'], ativo: true },
      ],
    })

    const erro = await store
      .criarSolicitacaoAgendamento({ ...DTO_BASE, profissionalId: 'prof-fantasma' })
      .catch((erroCapturado: unknown) => erroCapturado)

    expect(erro).toBeInstanceOf(SlotIndisponivelError)
    expect((erro as InstanceType<typeof SlotIndisponivelError>).codigo).toBe('SLOT_INDISPONIVEL')
    expect(store.contarAgendamentos()).toBe(0)
  })
})

describe('agendamentoStore — leituras da porta (FakeAgendamentoStore)', () => {
  it('listarProfissionaisAtivos exclui profissionais inativos e retorna apenas o formato público', async () => {
    const store = new FakeAgendamentoStore({
      profissionais: [
        PROFISSIONAL_SEED,
        { id: 'prof-2', nome: 'Dr. Bruno', cref: '654321-G/SP', ativo: false },
      ],
    })

    const resultado = await store.listarProfissionaisAtivos()

    expect(resultado).toEqual([{ id: 'prof-1', nome: 'Dra. Ana', cref: '123456-G/SP' }])
  })

  it('listarDiasLiberados retorna só os dias ativos do profissional, ordenados por data ascendente', async () => {
    const store = new FakeAgendamentoStore({
      disponibilidades: [
        // Semeado fora de ordem de propósito: a porta promete data ascendente (a implementação
        // Firestore ordena explicitamente, já que a query não garante ordem).
        { profissionalId: 'prof-1', data: '2026-08-21', horarios: ['09:00'], ativo: true },
        { profissionalId: 'prof-1', data: '2026-08-20', horarios: ['10:00'], ativo: true },
        { profissionalId: 'prof-1', data: '2026-08-22', horarios: ['11:00'], ativo: false },
        { profissionalId: 'prof-2', data: '2026-08-20', horarios: ['09:00'], ativo: true },
      ],
    })

    const resultado = await store.listarDiasLiberados('prof-1')

    expect(resultado).toEqual([
      { data: '2026-08-20', label: 'Qui, 20/08' },
      { data: '2026-08-21', label: 'Sex, 21/08' },
    ])
  })

  it('listarHorariosElegiveis exclui horário CONFIRMADO mas mantém os demais liberados', async () => {
    const store = new FakeAgendamentoStore({
      disponibilidades: [
        { profissionalId: 'prof-1', data: '2026-08-20', horarios: ['09:00', '10:00'], ativo: true },
      ],
      agendamentos: [
        {
          id: 'sol-confirmada',
          nomeCliente: 'Carlos Terceiro',
          telefoneExibicao: '(31) 97777-6666',
          telefoneNormalizado: '5531977776666',
          profissionalId: 'prof-1',
          data: '2026-08-20',
          horario: '09:00',
          status: 'CONFIRMADO',
        },
      ],
    })

    const resultado = await store.listarHorariosElegiveis('prof-1', '2026-08-20')

    expect(resultado).toEqual([{ horario: '10:00' }])
  })

  it('carregarConfiguracaoSucesso usa o fallback seguro exportado quando nada é semeado', async () => {
    const store = new FakeAgendamentoStore()

    const resultado = await store.carregarConfiguracaoSucesso()

    expect(resultado).toEqual(CONFIGURACAO_SUCESSO_FALLBACK)
  })
})

describe('FirestoreAgendamentoStore — configuração da tela de sucesso', () => {
  it('carregarConfiguracaoSucesso combina titulo e descricao de pos_agendamentos/textos com dicas e avisos de configuracao/pos-agendamentos', async () => {
    const getTextos = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        titulo: 'Solicitação recebida pela CrossHill',
        descricao: 'A equipe vai confirmar seu horário pelo telefone informado.',
      }),
    })
    const getConfiguracao = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        dicas: ['Leve uma garrafa de água.', 'Chegue com alguns minutos de antecedência.'],
        avisos: ['A solicitação ainda será confirmada pela equipe.'],
      }),
    })
    const textosDoc = vi.fn(() => ({ get: getTextos }))
    const configuracaoDoc = vi.fn(() => ({ get: getConfiguracao }))
    const collection = vi.fn((nome: string) => {
      if (nome === 'pos_agendamentos') return { doc: textosDoc }
      if (nome === 'configuracao') return { doc: configuracaoDoc }
      throw new Error(`collection inesperada: ${nome}`)
    })
    getFirestore.mockReturnValueOnce({ collection })
    const store = new FirestoreAgendamentoStore()

    const resultado = await store.carregarConfiguracaoSucesso()

    expect(collection).toHaveBeenCalledWith('pos_agendamentos')
    expect(textosDoc).toHaveBeenCalledWith('textos')
    expect(collection).toHaveBeenCalledWith('configuracao')
    expect(configuracaoDoc).toHaveBeenCalledWith('pos-agendamentos')
    expect(resultado).toEqual({
      titulo: 'Solicitação recebida pela CrossHill',
      descricao: 'A equipe vai confirmar seu horário pelo telefone informado.',
      regras: [],
      dicas: ['Leve uma garrafa de água.', 'Chegue com alguns minutos de antecedência.'],
      avisos: ['A solicitação ainda será confirmada pela equipe.'],
    })
  })

  it('carregarConfiguracaoSucesso tolera caminhos alternativos e aliases de listas configuráveis', async () => {
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
    const snapshots = new Map([
      [
        'pos_agendamento/textos',
        {
          exists: true,
          data: () => ({
            titulo: 'Tudo certo por aqui',
            descricao: 'Recebemos sua solicitação.',
          }),
        },
      ],
      [
        'configuracao/pos-agendamento',
        {
          exists: true,
          data: () => ({
            listaDicas: [{ texto: 'Confirme seus dados no telefone.' }],
            listaAvisos: 'A equipe ainda vai confirmar.\nNão considere o horário garantido.',
          }),
        },
      ],
    ])
    const collection = vi.fn((colecao: string) => ({
      doc: vi.fn((documento: string) => ({
        get: vi.fn().mockResolvedValue(
          snapshots.get(`${colecao}/${documento}`) ?? {
            exists: false,
            data: () => undefined,
          }
        ),
      })),
    }))
    getFirestore.mockReturnValueOnce({ collection })
    const store = new FirestoreAgendamentoStore()

    try {
      const resultado = await store.carregarConfiguracaoSucesso()

      expect(resultado).toEqual({
        titulo: 'Tudo certo por aqui',
        descricao: 'Recebemos sua solicitação.',
        regras: [],
        dicas: ['Confirme seus dados no telefone.'],
        avisos: ['A equipe ainda vai confirmar.', 'Não considere o horário garantido.'],
      })
    } finally {
      consoleInfo.mockRestore()
    }
  })
})

/**
 * CAUSA-RAIZ: `profissionalId` e `data` chegam de payload público e são usados como (parte de) ID
 * de documento Firestore — `.doc(profissionalId)` e `.doc(`{profissionalId}_{data}`)`. Como
 * `.doc()` trata `/` como separador de path, `prof-1/sub/x` produz um caminho de 4 segmentos
 * (`profissionais/prof-1/sub/x`), documento VÁLIDO em subcoleção: o chamador escolheria o
 * documento LIDO, não o procurado. O portão de formato do Route Handler (T7) é a primeira linha;
 * estes casos provam a segunda — a porta não confia cegamente no chamador.
 */
describe('FirestoreAgendamentoStore — id de documento não confia cegamente no chamador', () => {
  /**
   * Firestore mínimo: `collection()` devolve algo com `doc()`, e `runTransaction` executa o
   * callback com uma transação espiã. O guard dispara antes de qualquer uso desses retornos, e é
   * exatamente isso que as asserções verificam.
   */
  function firestoreEspiao() {
    // SUT_IS_CORRECT_BECAUSE: DocumentSnapshot real sempre expõe `data()`; o espíão antigo
    // simulava apenas QuerySnapshot e ficou incompleto após a leitura migrar para o mapa `slots`.
    const get = vi.fn().mockResolvedValue({ docs: [], data: () => ({ slots: {} }) })
    const subcollection = vi.fn(() => ({ get }))
    const doc = vi.fn(() => ({ id: 'doc-novo', collection: subcollection, get }))
    const collection = vi.fn(() => ({ doc }))
    const transacao = { get: vi.fn(), set: vi.fn() }
    const runTransaction = vi.fn((executar: (t: typeof transacao) => Promise<unknown>) =>
      executar(transacao)
    )
    getFirestore.mockReturnValue({ collection, runTransaction })
    return { doc, subcollection, transacao }
  }

  it.each([
    ['profissionalId com separador de path', 'prof-1/sub/x', '2026-08-20'],
    ['data com separador de path', 'prof-1', '2026-08-20/../outra'],
    ['profissionalId acima do limite de id do Firestore', 'p'.repeat(1501), '2026-08-20'],
  ])(
    'listarHorariosElegiveis: %s — recusa antes de montar a referência de documento',
    async (_descricao, profissionalId, data) => {
      const { doc } = firestoreEspiao()
      const store = new FirestoreAgendamentoStore()

      await expect(store.listarHorariosElegiveis(profissionalId, data)).rejects.toThrow(
        'não é um id de documento válido'
      )
      expect(doc).not.toHaveBeenCalled()
    }
  )

  it.each([
    ['profissionalId com separador de path', 'prof-1/sub/x', '2026-08-20'],
    ['data com separador de path', 'prof-1', '2026-08-20/../outra'],
  ])(
    'criarSolicitacaoAgendamento: %s — recusa sem ler nem escrever nada na transação',
    async (_descricao, profissionalId, data) => {
      const { transacao } = firestoreEspiao()
      const store = new FirestoreAgendamentoStore()

      await expect(
        store.criarSolicitacaoAgendamento({ ...DTO_BASE, profissionalId, data })
      ).rejects.toThrow('não é um id de documento válido')
      expect(transacao.get).not.toHaveBeenCalled()
      expect(transacao.set).not.toHaveBeenCalled()
    }
  )

  it('a mensagem do erro nunca ecoa o valor recusado (origem pública, tamanho arbitrário)', async () => {
    firestoreEspiao()
    const store = new FirestoreAgendamentoStore()
    const profissionalIdMalicioso = `prof-1/sub/${'x'.repeat(1000)}`

    const erro = await store
      .listarHorariosElegiveis(profissionalIdMalicioso, '2026-08-20')
      .catch((erroCapturado: unknown) => erroCapturado)

    expect(erro).toBeInstanceOf(Error)
    expect((erro as Error).message).toBe(
      '[agendamentoStore] profissionalId não é um id de documento válido'
    )
    expect((erro as Error).message).not.toContain('xxx')
  })

  // Companion positivo: o guard recusa o inendereçável, não o legítimo — id válido segue o fluxo
  // normal e chega a montar a referência de documento no SDK.
  it('id de documento legítimo passa e a leitura segue para o Firestore', async () => {
    const { doc } = firestoreEspiao()
    const store = new FirestoreAgendamentoStore()

    await store.listarHorariosElegiveis('profissional', '2026-08-20')

    expect(doc).toHaveBeenCalledWith('2026-08-20')
  })
})
