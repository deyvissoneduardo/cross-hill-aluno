// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SolicitacaoAgendamentoDTO } from '@/app/agendamento/types'

/**
 * Emula a camada de servidor do Next.js para o marcador `server-only` (mesma justificativa de
 * `lib/firebase/agendamentoStore.test.ts`/`rateLimit.test.ts`): `agendamentoStore.ts`,
 * `errors.ts` e `rateLimit.ts` importam `import 'server-only'` como primeira instrução — sem
 * este mock, o import derrubaria o módulo antes de qualquer teste rodar.
 */
vi.mock('server-only', () => ({}))

const { criarSolicitacaoAgendamento, registrarTentativa } = vi.hoisted(() => ({
  criarSolicitacaoAgendamento: vi.fn(),
  registrarTentativa: vi.fn(),
}))

/**
 * Mocka SOMENTE `criarSolicitacaoAgendamento` (a porta que o handler chama, T4) — reaproveita o
 * módulo REAL via `importOriginal` para manter `SlotIndisponivelError`/`TelefoneDuplicadoNoDiaError`
 * como as MESMAS classes que `errors.ts` (não mockado) usa no `instanceof` de
 * `mapearErroDominioAgendamento`. Mockar o módulo inteiro com objeto literal (como os testes de
 * GET fazem) quebraria esse `instanceof` — aqui o handler precisa da lógica real de mapeamento de
 * erro, não apenas do retorno da store.
 */
vi.mock('@/lib/firebase/agendamentoStore', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/firebase/agendamentoStore')>()
  return { ...real, criarSolicitacaoAgendamento }
})

/**
 * Mocka o singleton de antiabuso (Lei do seam — nenhum símbolo test-only em produção): o teste
 * controla `registrarTentativa` via `vi.fn()` idiomático do Vitest em vez de depender do contador
 * in-memory real do singleton (que persistiria estado entre testes deste arquivo e de outros
 * arquivos de teste, um antipadrão de dependência de ordem — AP-08).
 */
vi.mock('./rateLimit', () => ({
  limitadorAntiabusoPublico: { registrarTentativa },
}))

import { SlotIndisponivelError, TelefoneDuplicadoNoDiaError } from '@/lib/firebase/agendamentoStore'
import { erroLimiteAntiabuso } from './errors'
import { POST } from './route'

const IP_DO_TESTE = '203.0.113.5'

/** Corpo de payload válido — testes de erro sobrescrevem apenas o campo sob teste. */
function payloadValido(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    nomeCliente: '  Maria   da Silva  ',
    telefoneExibicao: '(11) 99999-8888',
    // Deliberadamente um telefone normalizado BOGUS e divergente do que `telefoneExibicao`
    // realmente normaliza — a invariante sob teste é que o servidor IGNORA este campo e
    // recomputa o telefone normalizado a partir de `telefoneExibicao` (§10.3).
    telefoneNormalizado: '00000000000000',
    profissionalId: 'prof-1',
    data: '2026-08-20',
    horario: '09:00',
    ...overrides,
  }
}

function requisicao(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/public/agendamentos', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-forwarded-for': IP_DO_TESTE, ...headers },
  })
}

/** Requisição SEM `x-forwarded-for` — `requisicao()` sempre injeta o header. */
function requisicaoSemIpEncaminhado(body: unknown): Request {
  return new Request('http://localhost/api/public/agendamentos', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** DTO devolvido pela store no caminho feliz — os testes que só olham o input do handler reusam. */
function dtoDaStore(): SolicitacaoAgendamentoDTO {
  return {
    id: 'ag-1',
    status: 'AGUARDANDO_CONFIRMACAO',
    profissionalNome: 'Ana Souza',
    data: '2026-08-20',
    horario: '09:00',
  }
}

/** Argumento único com que o handler chamou a store — o DTO efetivamente persistido (T4). */
function dtoPersistido(): { telefoneExibicao: string; telefoneNormalizado: string } {
  return criarSolicitacaoAgendamento.mock.calls[0][0]
}

describe('POST /api/public/agendamentos', () => {
  beforeEach(() => {
    criarSolicitacaoAgendamento.mockReset()
    registrarTentativa.mockReset()
  })

  it('CT-041: post_valid_payload_returns_pending_request — cria a solicitação e retorna AGUARDANDO_CONFIRMACAO sem dados de terceiros', async () => {
    const dto = dtoDaStore()
    criarSolicitacaoAgendamento.mockResolvedValueOnce(dto)

    const response = await POST(requisicao(payloadValido()))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(dto)
    expect(body.status).toBe('AGUARDANDO_CONFIRMACAO')
    // Contrato público (T2): nunca nome, telefone ou campo administrativo.
    expect(Object.keys(body)).toEqual(['id', 'status', 'profissionalNome', 'data', 'horario'])

    // Invariante central da task: nome normalizado (trim + colapso de espaços) e telefone
    // RECOMPUTADO a partir de `telefoneExibicao` — nunca o `telefoneNormalizado` bogus do corpo.
    expect(criarSolicitacaoAgendamento).toHaveBeenCalledTimes(1)
    expect(criarSolicitacaoAgendamento).toHaveBeenCalledWith({
      nomeCliente: 'Maria da Silva',
      telefoneNormalizado: '5511999998888',
      telefoneExibicao: '(11) 99999-8888',
      profissionalId: 'prof-1',
      data: '2026-08-20',
      horario: '09:00',
    })

    // Antiabuso aplicado ANTES da transação, com o telefone RECOMPUTADO (não o bogus do corpo).
    expect(registrarTentativa).toHaveBeenCalledTimes(1)
    expect(registrarTentativa).toHaveBeenCalledWith(IP_DO_TESTE, '5511999998888')
  })

  describe('telefoneExibicao persistido é derivado, nunca o texto bruto do cliente', () => {
    // CAUSA-RAIZ: o handler validava os DÍGITOS extraídos de `telefoneExibicao`
    // (`normalizarTelefoneBrasileiro` descarta todo não-dígito) mas persistia o TEXTO ORIGINAL.
    // Validado e persistido eram artefatos diferentes, e o persistido nunca atravessou portão
    // algum — sem limite de tamanho nem de conteúdo, ao contrário de `nomeCliente`
    // (`NOME_MAX_LENGTH`). O CT-041 não pegava isso porque o payload dele já manda o telefone na
    // máscara canônica, tornando entrada e saída indistinguíveis.
    it.each([
      ['celular já mascarado', '(11) 99999-8888', '(11) 99999-8888'],
      ['celular em outro formato', '+55 11 99999 8888', '(11) 99999-8888'],
      ['celular só em dígitos', '11999998888', '(11) 99999-8888'],
      ['fixo de 8 dígitos', '1133334444', '(11) 3333-4444'],
    ])(
      '%s — persiste a máscara determinística "%s" → "%s"',
      async (_descricao, telefoneExibicaoEnviado, exibicaoEsperada) => {
        criarSolicitacaoAgendamento.mockResolvedValueOnce(dtoDaStore())

        const response = await POST(
          requisicao(payloadValido({ telefoneExibicao: telefoneExibicaoEnviado }))
        )

        expect(response.status).toBe(200)
        expect(dtoPersistido().telefoneExibicao).toBe(exibicaoEsperada)
      }
    )

    it('telefone válido cercado de ~200KB de lixo: o lixo não é persistido nem entra na chave do antiabuso', async () => {
      criarSolicitacaoAgendamento.mockResolvedValueOnce(dtoDaStore())
      // O lixo é todo não-dígito, então `normalizarTelefoneBrasileiro` o descarta e o payload
      // passa a validação inteira — era exatamente assim que ~1MB chegava ao Firestore.
      const lixo = 'A'.repeat(200_000)

      const response = await POST(
        requisicao(payloadValido({ telefoneExibicao: `(11) 99999-8888${lixo}` }))
      )

      expect(response.status).toBe(200)
      expect(dtoPersistido().telefoneExibicao).toBe('(11) 99999-8888')
      expect(dtoPersistido().telefoneExibicao).not.toContain('A')
      expect(dtoPersistido().telefoneNormalizado).toBe('5511999998888')
      // O DTO inteiro que vai ao Firestore permanece do tamanho de um agendamento normal.
      expect(JSON.stringify(dtoPersistido()).length).toBeLessThan(300)
      expect(registrarTentativa).toHaveBeenCalledWith(IP_DO_TESTE, '5511999998888')
    })
  })

  describe('x-forwarded-for é tratado como pista, não identidade (chave do antiabuso)', () => {
    // CAUSA-RAIZ: o valor bruto do header — texto livre de tamanho arbitrário escolhido pelo
    // cliente — virava chave do `Map` de contagem do limitador. Restringir à FORMA de um IP não
    // torna o header confiável (impossível sem proxy confiável, ver JSDoc de `ipOrigem()`); só
    // impede que texto arbitrário do cliente vire chave. O freio real contra rotação do header é
    // a 2ª dimensão do limitador, provada em `rateLimit.test.ts`.
    it.each([
      ['IPv4 no topo da cadeia de proxies', '198.51.100.7, 203.0.113.9', '198.51.100.7'],
      ['IPv6', '2001:db8::1', '2001:db8::1'],
      ['texto sem forma de IP', 'nao-e-um-ip', 'desconhecido'],
      ['5000 caracteres do charset de um IP', '1'.repeat(5000), 'desconhecido'],
      ['header vazio', '', 'desconhecido'],
    ])(
      '%s — antiabuso recebe "%s" como IP de origem',
      async (_descricao, headerEnviado, ipEsperado) => {
        criarSolicitacaoAgendamento.mockResolvedValueOnce(dtoDaStore())

        const response = await POST(
          requisicao(payloadValido(), { 'x-forwarded-for': headerEnviado })
        )

        expect(response.status).toBe(200)
        expect(registrarTentativa).toHaveBeenCalledTimes(1)
        expect(registrarTentativa).toHaveBeenCalledWith(ipEsperado, '5511999998888')
      }
    )

    it('sem o header, o antiabuso ainda roda com a chave estável de IP desconhecido', async () => {
      criarSolicitacaoAgendamento.mockResolvedValueOnce(dtoDaStore())

      const response = await POST(requisicaoSemIpEncaminhado(payloadValido()))

      expect(response.status).toBe(200)
      expect(registrarTentativa).toHaveBeenCalledWith('desconhecido', '5511999998888')
    })
  })

  describe('payload inválido não chega à transação', () => {
    it.each([
      ['nome ausente', { nomeCliente: undefined }, 'Informe seu nome.'],
      ['nome com conteúdo abusivo', { nomeCliente: '<script>x</script>' }, 'Nome contém caracteres não permitidos.'],
      ['telefone ausente', { telefoneExibicao: undefined }, 'Informe um telefone.'],
      ['telefone em formato inválido', { telefoneExibicao: '123' }, 'Informe um telefone válido com DDD.'],
      ['profissionalId ausente', { profissionalId: undefined }, 'Informe profissional, data e horário.'],
      ['data ausente', { data: '' }, 'Informe profissional, data e horário.'],
      ['horario ausente', { horario: '   ' }, 'Informe profissional, data e horário.'],
    ])('%s — retorna 400 com erro de payload inválido e não chama a store nem o antiabuso', async (_descricao, overrides, mensagemEsperada) => {
      const response = await POST(requisicao(payloadValido(overrides)))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body).toEqual({ error: mensagemEsperada, codigo: 'PAYLOAD_INVALIDO' })
      expect(criarSolicitacaoAgendamento).not.toHaveBeenCalled()
      expect(registrarTentativa).not.toHaveBeenCalled()
    })

    // CAUSA-RAIZ: a validação dos campos de slot só perguntava "é uma string não-vazia?", nunca
    // "isto tem a FORMA de um identificador/data/horário?". Como `profissionalId` vira ID de
    // documento Firestore e `{profissionalId}_{data}` vira o ID do documento de disponibilidade,
    // e `.doc()` trata `/` como separador de path, quem escolhia o ENDEREÇO do documento lido era
    // o cliente — mesma classe do bug do `telefoneExibicao`: campo validado por um critério e
    // usado por outro. Os casos abaixo só falham com portão de FORMA; nenhum deles é pego por
    // "string não-vazia".
    it.each([
      ['data com mês e dia inexistentes', { data: '2026-13-99' }],
      ['data 29/02 em ano não bissexto', { data: '2026-02-29' }],
      ['data em outro formato', { data: '20/08/2026' }],
      ['horario sem dígitos', { horario: 'xx:yy' }],
      ['horario com hora e minuto inexistentes', { horario: '99:99' }],
      ['profissionalId com separador de path do Firestore', { profissionalId: 'prof-1/sub/x' }],
      ['profissionalId acima do comprimento máximo', { profissionalId: 'p'.repeat(129) }],
      ['profissionalId excessivamente longo', { profissionalId: 'p'.repeat(200_000) }],
    ])(
      '%s — retorna 400 com erro de payload inválido e não chama a store nem o antiabuso',
      async (_descricao, overrides) => {
        const response = await POST(requisicao(payloadValido(overrides)))
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body).toEqual({
          error: 'Profissional, data ou horário inválidos.',
          codigo: 'PAYLOAD_INVALIDO',
        })
        expect(criarSolicitacaoAgendamento).not.toHaveBeenCalled()
        expect(registrarTentativa).not.toHaveBeenCalled()
      }
    )

    // Companion positivo: o portão recusa a FORMA errada, não valores legítimos de borda.
    it.each([
      ['29/02 em ano bissexto', { data: '2024-02-29' }],
      ['último dia de mês de 31', { data: '2026-12-31' }],
      ['primeiro minuto do dia', { horario: '00:00' }],
      ['último minuto do dia', { horario: '23:59' }],
      ['profissionalId no comprimento máximo', { profissionalId: 'p'.repeat(128) }],
      ['profissionalId gerado pelo Firestore', { profissionalId: 'aBc123XyZ_09-defGhijk' }],
    ])('%s — aceito: chega à store e ao antiabuso', async (_descricao, overrides) => {
      criarSolicitacaoAgendamento.mockResolvedValueOnce(dtoDaStore())

      const response = await POST(requisicao(payloadValido(overrides)))

      expect(response.status).toBe(200)
      expect(criarSolicitacaoAgendamento).toHaveBeenCalledTimes(1)
      expect(criarSolicitacaoAgendamento.mock.calls[0][0]).toMatchObject(overrides)
      expect(registrarTentativa).toHaveBeenCalledTimes(1)
    })

    it('corpo que não é JSON válido retorna 400 sem chamar a store', async () => {
      const request = new Request('http://localhost/api/public/agendamentos', {
        method: 'POST',
        body: '{isto nao e json',
        headers: { 'x-forwarded-for': IP_DO_TESTE },
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body).toEqual({ error: 'Payload inválido.', codigo: 'PAYLOAD_INVALIDO' })
      expect(criarSolicitacaoAgendamento).not.toHaveBeenCalled()
    })
  })

  it('limite antiabuso excedido retorna o erro genérico de T6 e não chama a store', async () => {
    registrarTentativa.mockImplementationOnce(() => {
      throw erroLimiteAntiabuso()
    })

    const response = await POST(requisicao(payloadValido()))
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body).toEqual({
      error: 'Não foi possível concluir sua solicitação. Tente novamente mais tarde.',
      codigo: 'LIMITE_ANTIABUSO',
    })
    expect(criarSolicitacaoAgendamento).not.toHaveBeenCalled()
  })

  it('SlotIndisponivelError da store é mapeado para 409 público via mapearErroDominioAgendamento', async () => {
    criarSolicitacaoAgendamento.mockRejectedValueOnce(new SlotIndisponivelError())

    const response = await POST(requisicao(payloadValido()))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body).toEqual({ error: 'Este horário não está mais disponível.', codigo: 'SLOT_INDISPONIVEL' })
  })

  it('TelefoneDuplicadoNoDiaError da store é mapeado para 409 público sem vazar a mensagem interna', async () => {
    criarSolicitacaoAgendamento.mockRejectedValueOnce(new TelefoneDuplicadoNoDiaError())

    const response = await POST(requisicao(payloadValido()))
    const body = await response.json()

    expect(response.status).toBe(409)
    // Mensagem pública (tech_spec §9) é literalmente distinta da mensagem interna do erro de
    // domínio ("Você já possui UMA SOLICITAÇÃO DE AGENDAMENTO para este dia.") — a asserção
    // literal do texto público, mais a garantia de que "solicitação" não aparece no JSON,
    // prova que a mensagem interna de T4 nunca vaza ao cliente.
    expect(body).toEqual({
      error: 'Você já possui um agendamento para este dia.',
      codigo: 'TELEFONE_DUPLICADO_NO_DIA',
    })
    expect(JSON.stringify(body)).not.toContain('solicitação')
  })

  it('erro inesperado da store retorna 500 genérico sem vazar detalhe interno', async () => {
    criarSolicitacaoAgendamento.mockRejectedValueOnce(new Error('boom - detalhe interno do Firestore'))

    const response = await POST(requisicao(payloadValido()))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({
      error: 'Não foi possível concluir sua solicitação. Tente novamente.',
      codigo: 'ERRO_SERVIDOR',
    })
    expect(JSON.stringify(body)).not.toContain('boom')
  })
})
