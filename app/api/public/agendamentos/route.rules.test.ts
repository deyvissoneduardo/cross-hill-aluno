// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * T8 — completa a prova das regras de concorrência/duplicidade/privacidade do POST público
 * (tech_spec.md §7.1, §8.3, §9; RN-06/RN-07/RN-09). `route.test.ts` (T7) já prova o MAPEAMENTO de
 * erro isolado (`SlotIndisponivelError`/`TelefoneDuplicadoNoDiaError` → 409 público) mockando
 * `criarSolicitacaoAgendamento` com um `vi.fn()` que devolve um valor FIXO por chamada — a store
 * nunca tem estado real entre duas chamadas naqueles testes, então eles não conseguem provar
 * "dois POSTs para o mesmo slot geram dois ids distintos" nem "a segunda tentativa duplicada não
 * grava nada", porque não há nada gravado para contar.
 *
 * Este arquivo fecha essa lacuna: a store é substituída por uma implementação FAKE que reproduz
 * a MESMA lógica de negócio de T4 (elegibilidade, duplicidade diária por telefone, concorrência
 * permitida no mesmo slot — ver JSDoc de `criarSolicitacaoAgendamento` em
 * `lib/firebase/agendamentoStore.ts` e os casos CT-025/CT-026 de `agendamentoStore.test.ts`, cujas
 * invariantes são as MESMAS exercitadas aqui). A diferença é a fronteira: lá a invariante é
 * provada direto na store; aqui ela é provada atravessando o Route Handler real inteiro —
 * parsing, revalidação de servidor, antiabuso e mapeamento de erro (T6) — com estado real
 * persistindo entre chamadas dentro do mesmo teste (Iron Law #4/#9 da doutrina de testes: "Real
 * systems on the critical path").
 */
vi.mock('server-only', () => ({}))

/**
 * `vi.hoisted` guarda apenas uma INDIREÇÃO mutável (Lei do seam — nenhum símbolo test-only em
 * produção): o mock de `criarSolicitacaoAgendamento` sempre delega para `implementacaoAtual`, e
 * cada teste troca essa implementação para uma instância NOVA de `FakeAgendamentoStoreParaRotas`
 * (definida abaixo, fora do hoisted, para poder usar as classes de erro reais importadas de
 * `@/lib/firebase/agendamentoStore`). Isso evita compartilhar estado entre testes (AP-08).
 */
const { chamarStoreFake, usarFakeStore, registrarTentativa } = vi.hoisted(() => {
  let implementacaoAtual: (dto: unknown) => Promise<unknown> = async () => {
    throw new Error(
      'FakeAgendamentoStoreParaRotas não configurada — chame usarFakeStore() no beforeEach'
    )
  }
  return {
    chamarStoreFake: (dto: unknown) => implementacaoAtual(dto),
    usarFakeStore: (implementacao: (dto: unknown) => Promise<unknown>) => {
      implementacaoAtual = implementacao
    },
    registrarTentativa: vi.fn(),
  }
})

/**
 * Mocka SOMENTE `criarSolicitacaoAgendamento` (a porta que o handler chama, T4) — reaproveita o
 * módulo REAL via `importOriginal` para manter `SlotIndisponivelError`/`TelefoneDuplicadoNoDiaError`
 * como as MESMAS classes que `errors.ts` (não mockado) usa no `instanceof` de
 * `mapearErroDominioAgendamento` (mesmo padrão de `route.test.ts`, T7).
 */
vi.mock('@/lib/firebase/agendamentoStore', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/firebase/agendamentoStore')>()
  return { ...real, criarSolicitacaoAgendamento: chamarStoreFake }
})

/** Antiabuso mockado como no-op — este arquivo testa regras de domínio, não antiabuso (T6/T7 já cobrem). */
vi.mock('./rateLimit', () => ({
  limitadorAntiabusoPublico: { registrarTentativa },
}))

import type {
  CriarSolicitacaoAgendamentoDTO,
  SolicitacaoAgendamentoDTO,
  StatusSolicitacaoAgendamento,
} from '@/app/agendamento/types'
import {
  SlotIndisponivelError,
  STATUS_SOLICITACAO_ATIVOS,
  TelefoneDuplicadoNoDiaError,
} from '@/lib/firebase/agendamentoStore'
import { POST } from './route'

interface FakeProfissionalSeed {
  id: string
  nome: string
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
  telefoneNormalizado: string
  profissionalId: string
  data: string
  horario: string
  status: StatusSolicitacaoAgendamento
}

/**
 * Fake transacional mínimo, escopado a este arquivo de teste (mesmo padrão de
 * `lib/firebase/agendamentoStore.test.ts`, T4): reproduz só a regra de negócio de
 * `criarSolicitacaoAgendamento` que este arquivo exercita — elegibilidade, concorrência permitida
 * no mesmo slot e duplicidade diária por telefone — via estado in-memory. Não expõe nenhum método
 * que a interface `AgendamentoStore` de produção não teria, exceto `contarAgendamentos()`, helper
 * só de teste para provar ausência de escrita parcial (mesmo padrão de T4).
 */
class FakeAgendamentoStoreParaRotas {
  private readonly profissionais: FakeProfissionalSeed[]
  private readonly disponibilidades: FakeDisponibilidadeSeed[]
  private readonly agendamentos: FakeAgendamentoSeed[] = []
  private contadorId = 0

  constructor(seed: { profissionais: FakeProfissionalSeed[]; disponibilidades: FakeDisponibilidadeSeed[] }) {
    this.profissionais = seed.profissionais
    this.disponibilidades = seed.disponibilidades
  }

  async criarSolicitacaoAgendamento(
    dto: CriarSolicitacaoAgendamentoDTO
  ): Promise<SolicitacaoAgendamentoDTO> {
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

const PROFISSIONAL_SEED: FakeProfissionalSeed = { id: 'prof-1', nome: 'Dra. Ana', ativo: true }

const DISPONIBILIDADE_SEED: FakeDisponibilidadeSeed = {
  profissionalId: 'prof-1',
  data: '2026-08-20',
  horarios: ['09:00', '10:00', '11:00'],
  ativo: true,
}

/** Dois clientes distintos — telefones com DDD diferente para normalizar de forma inequívoca. */
const CLIENTE_A = { nomeCliente: 'Maria da Silva', telefoneExibicao: '(11) 99999-8888', telefoneNormalizado: '5511999998888' }
const CLIENTE_B = { nomeCliente: 'João Pereira', telefoneExibicao: '(21) 98888-7777', telefoneNormalizado: '5521988887777' }

function payload(
  cliente: { nomeCliente: string; telefoneExibicao: string },
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    nomeCliente: cliente.nomeCliente,
    telefoneExibicao: cliente.telefoneExibicao,
    profissionalId: 'prof-1',
    data: '2026-08-20',
    horario: '09:00',
    ...overrides,
  }
}

function requisicao(body: unknown): Request {
  return new Request('http://localhost/api/public/agendamentos', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-forwarded-for': '203.0.113.5' },
  })
}

describe('POST /api/public/agendamentos — regras de concorrência, duplicidade e privacidade (T8)', () => {
  let store: FakeAgendamentoStoreParaRotas

  beforeEach(() => {
    registrarTentativa.mockReset()
    store = new FakeAgendamentoStoreParaRotas({
      profissionais: [PROFISSIONAL_SEED],
      disponibilidades: [DISPONIBILIDADE_SEED],
    })
    usarFakeStore((dto) => store.criarSolicitacaoAgendamento(dto as CriarSolicitacaoAgendamentoDTO))
  })

  it('CT-011: allows_two_pending_requests_same_slot (CA-07, CA-12, CA-15) — dois POSTs concorrentes no mesmo slot são aceitos sem expor terceiros', async () => {
    const responseA = await POST(requisicao(payload(CLIENTE_A)))
    const bodyA = await responseA.json()
    const responseB = await POST(requisicao(payload(CLIENTE_B)))
    const bodyB = await responseB.json()

    expect(responseA.status).toBe(200)
    expect(responseB.status).toBe(200)
    expect(bodyA.status).toBe('AGUARDANDO_CONFIRMACAO')
    expect(bodyB.status).toBe('AGUARDANDO_CONFIRMACAO')

    // Ids distintos: cada POST gera um documento próprio (CA-12).
    expect(bodyA.id).not.toBe(bodyB.id)

    // Contrato público literal: só estas 5 chaves — nenhum campo administrativo/de terceiro,
    // nenhuma indicação (ex.: contador) de que existe uma segunda solicitação concorrente.
    expect(Object.keys(bodyA).sort()).toEqual(['data', 'horario', 'id', 'profissionalNome', 'status'])
    expect(Object.keys(bodyB).sort()).toEqual(['data', 'horario', 'id', 'profissionalNome', 'status'])

    // Nenhuma resposta contém dado do OUTRO cliente (nome, telefone normalizado ou id).
    const superficieA = JSON.stringify(bodyA)
    const superficieB = JSON.stringify(bodyB)
    expect(superficieA).not.toContain(CLIENTE_B.nomeCliente)
    expect(superficieA).not.toContain(CLIENTE_B.telefoneNormalizado)
    expect(superficieA).not.toContain(bodyB.id)
    expect(superficieB).not.toContain(CLIENTE_A.nomeCliente)
    expect(superficieB).not.toContain(CLIENTE_A.telefoneNormalizado)
    expect(superficieB).not.toContain(bodyA.id)

    expect(store.contarAgendamentos()).toBe(2)
  })

  it('CT-012: public_contract_preserves_admin_single_confirmation_rule (CA-08) — mesmo slot, ids distintos, ambas pendentes, prontas para triagem administrativa', async () => {
    const bodyA = await (await POST(requisicao(payload(CLIENTE_A)))).json()
    const bodyB = await (await POST(requisicao(payload(CLIENTE_B)))).json()

    expect(bodyA.id).not.toBe(bodyB.id)
    expect(bodyA.status).toBe('AGUARDANDO_CONFIRMACAO')
    expect(bodyB.status).toBe('AGUARDANDO_CONFIRMACAO')
    // Mesmo profissional/data/horário — é isso que permite ao admin localizar as duas
    // solicitações do mesmo slot e confirmar manualmente só uma.
    expect(bodyA.profissionalNome).toBe(bodyB.profissionalNome)
    expect(bodyA.data).toBe(bodyB.data)
    expect(bodyA.horario).toBe(bodyB.horario)
  })

  it('CT-013: blocks_same_phone_same_day (CA-09) — segunda tentativa do mesmo telefone no mesmo dia é bloqueada e não grava nada', async () => {
    const primeira = await POST(requisicao(payload(CLIENTE_A)))
    expect(primeira.status).toBe(200)
    expect(store.contarAgendamentos()).toBe(1)

    const segunda = await POST(requisicao(payload(CLIENTE_A, { horario: '10:00' })))
    const bodySegunda = await segunda.json()

    // Asserção literal do código/status exatos do erro público de T6.
    expect(segunda.status).toBe(409)
    expect(bodySegunda).toEqual({
      error: 'Você já possui um agendamento para este dia.',
      codigo: 'TELEFONE_DUPLICADO_NO_DIA',
    })
    // A mensagem interna de T4 ("solicitação de agendamento") nunca vaza na resposta pública.
    expect(JSON.stringify(bodySegunda)).not.toContain('solicitação')

    // Nenhuma escrita nova ocorreu: a contagem de documentos permanece a mesma de antes da
    // segunda tentativa — não apenas "retornou erro", mas "não gravou nada a mais".
    expect(store.contarAgendamentos()).toBe(1)
  })
})
