import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profissional } from '@/app/agendamento/types'

/**
 * Mocka a porta `AgendamentoStore` (T4) — o handler NUNCA acessa Firestore diretamente, e o
 * teste NUNCA cria um símbolo de produção só para si (Iron Law #6 / regra do seam). `vi.hoisted`
 * evita a armadilha de referenciar uma `const` de módulo dentro do factory de `vi.mock` antes de
 * ela existir (o `vi.mock` é hoisted pelo Vitest para antes dos imports estáticos do arquivo).
 */
const { listarProfissionaisAtivos } = vi.hoisted(() => ({
  listarProfissionaisAtivos: vi.fn(),
}))

vi.mock('@/lib/firebase/agendamentoStore', () => ({
  listarProfissionaisAtivos,
}))

import { GET } from './route'

describe('GET /api/public/profissionais', () => {
  beforeEach(() => {
    listarProfissionaisAtivos.mockReset()
  })

  it('CT-030: get_public_professionals_returns_public_fields — retorna somente id e nome do profissional configurado', async () => {
    // `listarProfissionaisAtivos` (T4) já filtra `ativo == true` — o mock simula esse contrato
    // devolvendo só o ativo; a invariante sob teste é que o handler REPASSA fielmente esse
    // resultado como JSON 200, sem envelope extra nem campo administrativo adicional.
    const ativo: Profissional = { id: 'profissional', nome: 'Ana Souza' }
    listarProfissionaisAtivos.mockResolvedValueOnce([ativo])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([{ id: 'profissional', nome: 'Ana Souza' }])
    expect(Object.keys(body[0])).toEqual(['id', 'nome'])
  })

  it('CT-030 (negative companion): nenhum profissional ativo retorna lista pública vazia, não erro', async () => {
    // Cenário-limite de CA-04/CA-15: quando a store não tem nenhum profissional ativo (todos
    // inativos, coleção vazia), o handler deve responder 200 com array vazio — nunca inventar
    // dados, nunca 404/500, e nunca deixar um profissional inativo escapar por fallback.
    listarProfissionaisAtivos.mockResolvedValueOnce([])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('retorna 500 genérico sem stack trace quando a store lança uma exceção inesperada', async () => {
    listarProfissionaisAtivos.mockRejectedValueOnce(new Error('boom - detalhe interno do Firestore'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(Object.keys(body)).toEqual(['error'])
    expect(JSON.stringify(body)).not.toContain('boom')
  })
})
