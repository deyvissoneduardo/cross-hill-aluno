import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConfiguracaoSucesso } from '@/app/agendamento/types'

/**
 * Mocka a porta `AgendamentoStore` (T4) — o handler NUNCA acessa Firestore diretamente, e o
 * teste NUNCA cria um símbolo de produção só para si (Iron Law #6 / regra do seam). `vi.hoisted`
 * evita a armadilha de referenciar uma `const` de módulo dentro do factory de `vi.mock` antes de
 * ela existir (o `vi.mock` é hoisted pelo Vitest para antes dos imports estáticos do arquivo).
 */
const { carregarConfiguracaoSucesso } = vi.hoisted(() => ({
  carregarConfiguracaoSucesso: vi.fn(),
}))

vi.mock('@/lib/firebase/agendamentoStore', () => ({
  carregarConfiguracaoSucesso,
}))

import { GET } from './route'

describe('GET /api/public/configuracao/sucesso', () => {
  beforeEach(() => {
    carregarConfiguracaoSucesso.mockReset()
  })

  it('CT-034: get_success_config_returns_plain_text_or_safe_empty — retorna a configuração pública configurada como texto simples', async () => {
    const configuracao: ConfiguracaoSucesso = {
      titulo: 'Solicitação enviada!',
      descricao: 'Aguarde a confirmação da academia pelo telefone informado.',
      regras: ['Chegue com 10 minutos de antecedência.'],
      dicas: ['Traga uma garrafa de água.'],
      avisos: ['O horário só é confirmado após retorno da equipe.'],
    }
    carregarConfiguracaoSucesso.mockResolvedValueOnce(configuracao)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(configuracao)
    expect(Object.keys(body)).toEqual(['titulo', 'descricao', 'regras', 'dicas', 'avisos'])
    // Textos públicos são sempre string simples — nenhuma marcação HTML/script deve sobreviver
    // ao repasse do handler (RN-14 / tech_spec.md §10.2: textos configuráveis nunca são HTML).
    const todosOsTextos = [
      body.titulo,
      body.descricao,
      ...body.regras,
      ...body.dicas,
      ...body.avisos,
    ]
    for (const texto of todosOsTextos) {
      expect(typeof texto).toBe('string')
      expect(texto).not.toMatch(/[<>]/)
    }
  })

  it('CT-034 (negative companion): configuração ausente/inválida repassa o fallback seguro com 200, nunca 404/500', async () => {
    // `carregarConfiguracaoSucesso` (T4) nunca lança e nunca retorna `null` — quando a
    // configuração está ausente/incompleta/corrompida, ela já resolve internamente para o
    // fallback seguro. A invariante sob teste é que o handler repassa esse fallback com 200,
    // sem tentar reinterpretar ausência como erro.
    const fallback: ConfiguracaoSucesso = {
      titulo: 'Solicitação enviada',
      descricao: 'Sua solicitação de agendamento foi registrada e aguarda confirmação.',
      regras: [],
      dicas: [],
      avisos: [],
    }
    carregarConfiguracaoSucesso.mockResolvedValueOnce(fallback)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(fallback)
  })
})
