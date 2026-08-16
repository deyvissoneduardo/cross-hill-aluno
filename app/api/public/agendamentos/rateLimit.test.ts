// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

/**
 * Emula a camada de servidor do Next.js para o marcador `server-only` (mesma justificativa de
 * `lib/firebase/admin.test.ts` e `lib/firebase/agendamentoStore.test.ts`): `rateLimit.ts` e
 * `errors.ts` importam `import 'server-only'` como primeira instrução, e o runner do Vitest
 * resolve o pacote sem a condição `react-server` — sem este mock, o import derrubaria o
 * arquivo inteiro antes de qualquer teste rodar.
 */
vi.mock('server-only', () => ({}))

import { limitarSolicitacaoPublica } from './rateLimit'

const IP_ORIGEM = '203.0.113.10'
const TELEFONE_NORMALIZADO = '5561999999999'

/** Termos que a mensagem/campos do erro público NUNCA podem conter (tech_spec.md §10.2.1). */
const TERMOS_PROIBIDOS = [/contador/i, /janela/i, /\bip\b/i, /telefone/i]

describe('limitarSolicitacaoPublica', () => {
  it('CT-024: public_post_rate_limit_is_generic — exceder o limite lança erro público genérico sem revelar a regra interna', () => {
    const limitador = limitarSolicitacaoPublica({ limiteTentativas: 2, janelaEmMs: 60_000 })

    // Duas tentativas dentro do limite configurado não devem lançar.
    limitador.registrarTentativa(IP_ORIGEM, TELEFONE_NORMALIZADO)
    limitador.registrarTentativa(IP_ORIGEM, TELEFONE_NORMALIZADO)

    let erroCapturado: unknown
    try {
      limitador.registrarTentativa(IP_ORIGEM, TELEFONE_NORMALIZADO)
    } catch (erro) {
      erroCapturado = erro
    }

    expect(erroCapturado).toBeInstanceOf(Error)
    const erro = erroCapturado as Error

    // Mensagem EXATA — mesma linha "Limite antiabuso" da tabela de Gerenciamento de Erros do
    // tech_spec §9. Asserção literal, não substring genérica.
    expect(erro.message).toBe(
      'Não foi possível concluir sua solicitação. Tente novamente mais tarde.'
    )

    // Superfície completa que poderia escapar para log/telemetria/resposta HTTP: nenhum campo
    // pode conter contador, janela ou "IP"/"telefone" literal (§10.2.1).
    const superficieDoErro = JSON.stringify(erro, Object.getOwnPropertyNames(erro))
    for (const termoProibido of TERMOS_PROIBIDOS) {
      expect(superficieDoErro).not.toMatch(termoProibido)
    }
  })

  it('CT-024 (negative companion): chamadas abaixo do limite configurado não são bloqueadas', () => {
    const limitador = limitarSolicitacaoPublica({ limiteTentativas: 2, janelaEmMs: 60_000 })

    expect(() => limitador.registrarTentativa(IP_ORIGEM, TELEFONE_NORMALIZADO)).not.toThrow()
    expect(() => limitador.registrarTentativa(IP_ORIGEM, TELEFONE_NORMALIZADO)).not.toThrow()
  })

  // CAUSA-RAIZ: os dois testes acima chamam `limitarSolicitacaoPublica` sem sobrescrever `agora`,
  // então o limitador usa o default de produção (`Date.now()`). Como todas as chamadas de um
  // teste ocorrem em microssegundos, `agoraMs - timestamp` nunca se aproxima de `janelaEmMs`
  // (60_000ms) — o ramo `.filter((timestamp) => agoraMs - timestamp < janelaEmMs)` sempre mantém
  // 100% das tentativas na janela, mas nenhuma asserção prova que ele TAMBÉM remove tentativas
  // antigas quando a janela expira. Uma mutação que substituísse o `.filter(...)` por
  // `tentativasPorChave.get(chave) ?? []` (nunca esquecer tentativas antigas → bloqueio
  // permanente de um cliente legítimo) manteria os 2 testes acima verdes. Corrigido injetando um
  // relógio simulado controlável via `agora` (campo já injetável na configuração) e avançando-o
  // manualmente entre chamadas — sem `setTimeout`/`vi.useFakeTimers()` (nenhum teste do repo usa
  // fake timers; ver `lib/firebase/agendamentoStore.test.ts`, `admin.test.ts`, etc.).
  it('CT-024 (janela deslizante): expira tentativas antigas e permite novas chamadas após janelaEmMs', () => {
    let agoraMs = 0
    const agora = () => agoraMs

    const limitador = limitarSolicitacaoPublica({
      limiteTentativas: 2,
      janelaEmMs: 60_000,
      agora,
    })

    // Duas tentativas em t=0 preenchem o limite dentro da janela.
    limitador.registrarTentativa(IP_ORIGEM, TELEFONE_NORMALIZADO)
    limitador.registrarTentativa(IP_ORIGEM, TELEFONE_NORMALIZADO)

    // Ponta 1: uma terceira tentativa AINDA dentro da janela (t=1ms) excede o limite e lança.
    agoraMs = 1
    expect(() => limitador.registrarTentativa(IP_ORIGEM, TELEFONE_NORMALIZADO)).toThrow()

    // Ponta 2: avançar o relógio simulado para ALÉM de janelaEmMs (60_000ms) expira as tentativas
    // registradas em t=0 e t=1 — a mesma combinação IP+telefone não deve mais ser bloqueada.
    agoraMs = 60_001
    expect(() => limitador.registrarTentativa(IP_ORIGEM, TELEFONE_NORMALIZADO)).not.toThrow()
  })
})
