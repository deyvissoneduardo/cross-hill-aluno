/**
 * Testes de integração do repository de criação de Solicitação de Agendamento — T9.
 *
 * INVARIANT (CT-036): toda falha HTTP/domínio do POST `/api/public/agendamentos` vira um
 * `ErroRepository` tipado — nunca `Response` cru nem stack trace — e o sucesso (200) mapeia
 * para `SolicitacaoAgendamento` ignorando qualquer campo extra inesperado do JSON.
 * OWNING_LAYER: service-integration — MSW intercepta `fetch` na fronteira HTTP real.
 * EXISTING_SUITE: nenhuma — primeiro teste desta pasta (T9 cria a suíte).
 * Real execution boundary: MSW na fronteira HTTP real; `agendamentosRepository` é o módulo
 * real, sem substituição.
 *
 * Asserção literal (Iron Rule #5 da task): cada status (200/400/409 x2/429/500) é um teste
 * próprio com o sentinela EXATO esperado — não "algum erro".
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { agendamentosRepository } from '../agendamentosRepository'
import type { CriarSolicitacaoAgendamentoDTO } from '../../types'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const dtoValido: CriarSolicitacaoAgendamentoDTO = {
  nomeCliente: 'Maria Silva',
  telefoneNormalizado: '5561999999999',
  telefoneExibicao: '(61) 99999-9999',
  profissionalId: 'prof-1',
  data: '2026-08-20',
  horario: '09:00',
}

describe('CT-036 — repositories_map_http_errors_to_typed_domain_errors', () => {
  it('200 com sucesso mapeia para SolicitacaoAgendamento, ignorando campo extra inesperado no JSON', async () => {
    server.use(
      http.post('/api/public/agendamentos', () =>
        HttpResponse.json({
          id: 'sol-1',
          status: 'AGUARDANDO_CONFIRMACAO',
          profissionalNome: 'Ana Souza',
          data: '2026-08-20',
          horario: '09:00',
          // Campo de terceiro/servidor que NUNCA deve vazar no model (CA-15).
          telefoneExibicao: '(61) 99999-9999',
        })
      )
    )

    const resultado = await agendamentosRepository.criar(dtoValido)

    expect(resultado).toEqual({
      ok: true,
      dados: {
        id: 'sol-1',
        status: 'AGUARDANDO_CONFIRMACAO',
        profissionalNome: 'Ana Souza',
        data: '2026-08-20',
        horario: '09:00',
      },
    })
    if (resultado.ok) {
      expect(Object.keys(resultado.dados).sort()).toEqual(['data', 'horario', 'id', 'profissionalNome', 'status'])
    }
  })

  it('envia o payload completo, incluindo telefoneNormalizado (ignorado pelo servidor, exigido pelo tipo do DTO)', async () => {
    let corpoRecebido: unknown
    server.use(
      http.post('/api/public/agendamentos', async ({ request }) => {
        corpoRecebido = await request.json()
        return HttpResponse.json({
          id: 'sol-1',
          status: 'AGUARDANDO_CONFIRMACAO',
          profissionalNome: 'Ana Souza',
          data: '2026-08-20',
          horario: '09:00',
        })
      })
    )

    await agendamentosRepository.criar(dtoValido)

    expect(corpoRecebido).toEqual(dtoValido)
  })

  it('400 com codigo PAYLOAD_INVALIDO mapeia para sentinela tipado PAYLOAD_INVALIDO', async () => {
    server.use(
      http.post('/api/public/agendamentos', () =>
        HttpResponse.json({ error: 'Informe profissional, data e horário.', codigo: 'PAYLOAD_INVALIDO' }, { status: 400 })
      )
    )

    const resultado = await agendamentosRepository.criar(dtoValido)

    expect(resultado).toEqual({
      ok: false,
      erro: { tipo: 'PAYLOAD_INVALIDO', mensagem: 'Informe profissional, data e horário.' },
    })
  })

  it('409 com codigo SLOT_INDISPONIVEL mapeia para sentinela tipado SLOT_INDISPONIVEL', async () => {
    server.use(
      http.post('/api/public/agendamentos', () =>
        HttpResponse.json(
          { error: 'Este horário não está mais disponível.', codigo: 'SLOT_INDISPONIVEL' },
          { status: 409 }
        )
      )
    )

    const resultado = await agendamentosRepository.criar(dtoValido)

    expect(resultado).toEqual({
      ok: false,
      erro: { tipo: 'SLOT_INDISPONIVEL', mensagem: 'Este horário não está mais disponível.' },
    })
  })

  it('409 com codigo REAL TELEFONE_DUPLICADO_NO_DIA (não o DUPLICIDADE_DIA desatualizado da task) mapeia para sentinela de duplicidade', async () => {
    server.use(
      http.post('/api/public/agendamentos', () =>
        HttpResponse.json(
          { error: 'Você já possui um agendamento para este dia.', codigo: 'TELEFONE_DUPLICADO_NO_DIA' },
          { status: 409 }
        )
      )
    )

    const resultado = await agendamentosRepository.criar(dtoValido)

    expect(resultado).toEqual({
      ok: false,
      erro: { tipo: 'TELEFONE_DUPLICADO_NO_DIA', mensagem: 'Você já possui um agendamento para este dia.' },
    })
  })

  it('429 com codigo LIMITE_ANTIABUSO mapeia para sentinela tipado de limite, sem vazar contador/janela', async () => {
    server.use(
      http.post('/api/public/agendamentos', () =>
        HttpResponse.json(
          { error: 'Não foi possível concluir sua solicitação. Tente novamente mais tarde.', codigo: 'LIMITE_ANTIABUSO' },
          { status: 429 }
        )
      )
    )

    const resultado = await agendamentosRepository.criar(dtoValido)

    expect(resultado).toEqual({
      ok: false,
      erro: { tipo: 'LIMITE_ANTIABUSO', mensagem: 'Não foi possível concluir sua solicitação. Tente novamente mais tarde.' },
    })
  })

  it('500 com codigo ERRO_SERVIDOR mapeia para sentinela tipado SERVIDOR genérico', async () => {
    server.use(
      http.post('/api/public/agendamentos', () =>
        HttpResponse.json(
          { error: 'Não foi possível concluir sua solicitação. Tente novamente.', codigo: 'ERRO_SERVIDOR' },
          { status: 500 }
        )
      )
    )

    const resultado = await agendamentosRepository.criar(dtoValido)

    expect(resultado).toEqual({
      ok: false,
      erro: { tipo: 'SERVIDOR', mensagem: 'Não foi possível concluir sua solicitação. Tente novamente.' },
    })
  })

  it('200 com corpo malformado (sem `status` válido) mapeia para sentinela tipado SERVIDOR, sem vazar o corpo bruto', async () => {
    server.use(
      http.post('/api/public/agendamentos', () =>
        HttpResponse.json({ id: 'sol-1', status: 'STATUS_DESCONHECIDO', profissionalNome: 'Ana Souza', data: '2026-08-20', horario: '09:00' })
      )
    )

    const resultado = await agendamentosRepository.criar(dtoValido)

    expect(resultado).toEqual({ ok: false, erro: { tipo: 'SERVIDOR', mensagem: 'Resposta inválida do servidor.' } })
  })

  it('falha de rede (fetch rejeitando) mapeia para sentinela tipado REDE, distinta de erro de servidor', async () => {
    server.use(http.post('/api/public/agendamentos', () => HttpResponse.error()))

    const resultado = await agendamentosRepository.criar(dtoValido)

    expect(resultado).toEqual({ ok: false, erro: { tipo: 'REDE' } })
  })
})
