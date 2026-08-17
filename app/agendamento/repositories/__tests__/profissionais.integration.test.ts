/**
 * Testes de integração dos repositories de LEITURA (profissionais, disponibilidade,
 * configuração de sucesso) contra o BFF público — T9.
 *
 * INVARIANT (CT-005): o repository de profissionais mapeia o DTO público fielmente — não
 * reintroduz nem quebra o filtro de ativos que o servidor já aplica, e não vaza campo extra
 * inesperado do JSON no model.
 * INVARIANT (CT-035): os repositories da feature usam somente URLs `/api/public/*` (nunca um
 * domínio hardcoded de terceiro) e nenhum arquivo de repository importa código server-only
 * (`lib/firebase/*`, `firebase-admin`, `server-only`).
 * OWNING_LAYER: service-integration (fronteira HTTP real via MSW) para CT-005 e os testes de
 * leitura adicionais; unit (fetch spy) + análise estática de código-fonte para CT-035.
 * EXISTING_SUITE: nenhuma — primeiro teste desta pasta (T9 cria a suíte).
 * Real execution boundary: MSW intercepta `fetch` na fronteira HTTP real (não é um mock de
 * colaborador interno); os módulos de repository sob teste são os reais, sem substituição.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { profissionaisRepository } from '../profissionaisRepository'
import { disponibilidadeRepository } from '../disponibilidadeRepository'
import { configuracaoRepository } from '../configuracaoRepository'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('CT-005 — repository_filters_active_professionals', () => {
  it('mapeia o DTO público fielmente e ignora campo extra inesperado, sem reintroduzir inativo', async () => {
    server.use(
      http.get('/api/public/profissionais', () =>
        HttpResponse.json([
          { id: 'prof-1', nome: 'Ana Souza', cref: '123456-G/DF' },
          // O servidor já filtra ativos (T5) — o repository não deve reintroduzir `ativo`
          // nem qualquer outro campo extra do JSON no model mapeado (parse defensivo).
          { id: 'prof-2', nome: 'Bruno Lima', cref: '654321-G/DF', ativo: true },
        ])
      )
    )

    const resultado = await profissionaisRepository.listar()

    expect(resultado).toEqual({
      ok: true,
      dados: [
        { id: 'prof-1', nome: 'Ana Souza', cref: '123456-G/DF' },
        { id: 'prof-2', nome: 'Bruno Lima', cref: '654321-G/DF' },
      ],
    })
    if (resultado.ok) {
      for (const profissional of resultado.dados) {
        expect(Object.keys(profissional).sort()).toEqual(['cref', 'id', 'nome'])
      }
    }
  })

  it('descarta item malformado da lista sem quebrar o parse dos demais', async () => {
    server.use(
      http.get('/api/public/profissionais', () =>
        HttpResponse.json([{ id: 'prof-1', nome: 'Ana Souza', cref: '123456-G/DF' }, { id: 'prof-sem-nome' }])
      )
    )

    const resultado = await profissionaisRepository.listar()

    expect(resultado).toEqual({ ok: true, dados: [{ id: 'prof-1', nome: 'Ana Souza', cref: '123456-G/DF' }] })
  })
})

describe('cobertura de leitura adicional (Aceite Técnico: "MSW cobre sucesso e falhas principais")', () => {
  it('disponibilidadeRepository.listarDias mapeia os dias liberados retornados', async () => {
    server.use(
      http.get('/api/public/profissionais/prof-1/dias', () =>
        HttpResponse.json([{ data: '2026-08-20', label: 'Qui, 20/08' }])
      )
    )

    const resultado = await disponibilidadeRepository.listarDias('prof-1')

    expect(resultado).toEqual({ ok: true, dados: [{ data: '2026-08-20', label: 'Qui, 20/08' }] })
  })

  it('disponibilidadeRepository.listarHorarios envia `data` como query string e mapeia horários', async () => {
    let urlRecebida = ''
    server.use(
      http.get('/api/public/profissionais/prof-1/horarios', ({ request }) => {
        urlRecebida = request.url
        return HttpResponse.json([{ horario: '09:00' }])
      })
    )

    const resultado = await disponibilidadeRepository.listarHorarios('prof-1', '2026-08-20')

    expect(resultado).toEqual({ ok: true, dados: [{ horario: '09:00' }] })
    expect(new URL(urlRecebida).searchParams.get('data')).toBe('2026-08-20')
  })

  it('disponibilidadeRepository.listarHorarios mapeia 400 (data ausente/inválida) para sentinela SERVIDOR', async () => {
    server.use(
      http.get('/api/public/profissionais/prof-1/horarios', () =>
        HttpResponse.json({ error: 'Informe uma data válida no formato AAAA-MM-DD.' }, { status: 400 })
      )
    )

    const resultado = await disponibilidadeRepository.listarHorarios('prof-1', 'data-invalida')

    expect(resultado).toEqual({
      ok: false,
      erro: { tipo: 'SERVIDOR', mensagem: 'Informe uma data válida no formato AAAA-MM-DD.' },
    })
  })

  it('configuracaoRepository.buscarSucesso mapeia os textos configuráveis', async () => {
    server.use(
      http.get('/api/public/configuracao/sucesso', () =>
        HttpResponse.json({
          titulo: 'Solicitação enviada!',
          descricao: 'Aguarde a confirmação administrativa.',
          regras: ['Chegue com 10 minutos de antecedência.'],
          dicas: ['Leve documento com foto.'],
          avisos: [],
        })
      )
    )

    const resultado = await configuracaoRepository.buscarSucesso()

    expect(resultado).toEqual({
      ok: true,
      dados: {
        titulo: 'Solicitação enviada!',
        descricao: 'Aguarde a confirmação administrativa.',
        regras: ['Chegue com 10 minutos de antecedência.'],
        dicas: ['Leve documento com foto.'],
        avisos: [],
      },
    })
  })

  it('mapeia falha de rede (fetch rejeitando) para sentinela REDE, distinta de erro de servidor', async () => {
    server.use(http.get('/api/public/profissionais', () => HttpResponse.error()))

    const resultado = await profissionaisRepository.listar()

    expect(resultado).toEqual({ ok: false, erro: { tipo: 'REDE' } })
  })

  it('mapeia 500 de um endpoint GET (só `{ error }`, sem `codigo`) para sentinela SERVIDOR', async () => {
    server.use(
      http.get('/api/public/profissionais', () =>
        HttpResponse.json({ error: 'Não foi possível carregar os profissionais. Tente novamente.' }, { status: 500 })
      )
    )

    const resultado = await profissionaisRepository.listar()

    expect(resultado).toEqual({
      ok: false,
      erro: { tipo: 'SERVIDOR', mensagem: 'Não foi possível carregar os profissionais. Tente novamente.' },
    })
  })
})

describe('CT-035 — repositories_use_public_urls_only', () => {
  it('profissionaisRepository.listar chama fetch com path literal /api/public/profissionais, sem domínio hardcoded', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }))

    await profissionaisRepository.listar()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const urlChamada = new URL(String(fetchSpy.mock.calls[0]?.[0]))
    expect(urlChamada.pathname).toBe('/api/public/profissionais')

    fetchSpy.mockRestore()
  })

  it('disponibilidadeRepository chama fetch com paths /api/public/profissionais/{id}/dias e /horarios', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }))

    await disponibilidadeRepository.listarDias('prof-9')
    await disponibilidadeRepository.listarHorarios('prof-9', '2026-08-20')

    const urls = fetchSpy.mock.calls.map((chamada) => new URL(String(chamada[0])))
    expect(urls[0]?.pathname).toBe('/api/public/profissionais/prof-9/dias')
    expect(urls[1]?.pathname).toBe('/api/public/profissionais/prof-9/horarios')
    expect(urls[1]?.searchParams.get('data')).toBe('2026-08-20')

    fetchSpy.mockRestore()
  })

  it('configuracaoRepository.buscarSucesso chama fetch com path literal /api/public/configuracao/sucesso', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))

    await configuracaoRepository.buscarSucesso()

    const urlChamada = new URL(String(fetchSpy.mock.calls[0]?.[0]))
    expect(urlChamada.pathname).toBe('/api/public/configuracao/sucesso')

    fetchSpy.mockRestore()
  })

  it('nenhum arquivo de repository importa lib/firebase/*, firebase-admin ou declara "server-only"', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const diretorio = path.join(process.cwd(), 'app/agendamento/repositories')
    const entradas = await fs.readdir(diretorio, { withFileTypes: true })
    const arquivosDeRepository = entradas.filter((entrada) => entrada.isFile() && entrada.name.endsWith('.ts'))

    expect(arquivosDeRepository.length).toBeGreaterThan(0)

    for (const arquivo of arquivosDeRepository) {
      const conteudo = await fs.readFile(path.join(diretorio, arquivo.name), 'utf-8')
      expect(conteudo).not.toMatch(/lib\/firebase/)
      expect(conteudo).not.toMatch(/firebase-admin/)
      expect(conteudo).not.toMatch(/['"]server-only['"]/)
    }
  })
})
