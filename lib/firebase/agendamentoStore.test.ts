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
  SlotIndisponivelError,
  STATUS_SOLICITACAO_ATIVOS,
  TelefoneDuplicadoNoDiaError,
  formatarLabelDia,
  type AgendamentoStore,
} from './agendamentoStore'

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
