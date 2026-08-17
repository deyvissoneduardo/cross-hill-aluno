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

import { ErroDominioAgendamento } from './errors'
import { limitadorAntiabusoPublico, limitarSolicitacaoPublica } from './rateLimit'

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

describe('limitarSolicitacaoPublica — dimensão por telefone (independente do IP)', () => {
  // CAUSA-RAIZ: a chave do limitador era `ip:telefone`, e AS DUAS METADES vêm do cliente — o
  // telefone pelo payload e o "IP" por `x-forwarded-for`, header que o cliente forja quando não
  // há proxy confiável reescrevendo-o (ver JSDoc de `ipOrigem()` em `route.ts`). Rotacionar o
  // header dava um contador zerado por requisição, então o único freio do endpoint público de
  // escrita era nulo na prática. Os testes acima não pegavam isso porque todos reusam o MESMO
  // `IP_ORIGEM`. Corrigido com uma segunda dimensão que não lê o IP.
  const TELEFONE_ALVO = '5511999998888'

  it('IP rotacionado a cada tentativa não escapa: a dimensão por telefone esgota e bloqueia', () => {
    const limitador = limitarSolicitacaoPublica({
      limiteTentativas: 2,
      limiteTentativasPorTelefone: 4,
      janelaEmMs: 60_000,
    })

    // Cada tentativa forja um IP inédito, então a dimensão `ip+telefone` vê SEMPRE contador 0 e
    // jamais bloqueia (limiteTentativas=2 nunca é alcançado). Só a dimensão por telefone conta.
    for (let tentativa = 1; tentativa <= 4; tentativa += 1) {
      expect(() =>
        limitador.registrarTentativa(`198.51.100.${tentativa}`, TELEFONE_ALVO)
      ).not.toThrow()
    }

    // 5ª tentativa, ainda com IP inédito: se o limitador dependesse só do IP, esta também
    // passaria. É a dimensão por telefone (4/4 na janela) que a barra.
    let erroCapturado: unknown
    try {
      limitador.registrarTentativa('198.51.100.5', TELEFONE_ALVO)
    } catch (erro) {
      erroCapturado = erro
    }

    expect(erroCapturado).toBeInstanceOf(ErroDominioAgendamento)
    const erro = erroCapturado as ErroDominioAgendamento
    expect(erro.codigo).toBe('LIMITE_ANTIABUSO')
    expect(erro.status).toBe(429)
    expect(erro.message).toBe(
      'Não foi possível concluir sua solicitação. Tente novamente mais tarde.'
    )
  })

  it('o orçamento por telefone é por telefone: telefones distintos do mesmo IP não se afetam', () => {
    const limitador = limitarSolicitacaoPublica({
      limiteTentativas: 5,
      limiteTentativasPorTelefone: 2,
      janelaEmMs: 60_000,
    })
    const ipCompartilhado = '203.0.113.30'
    const telefones = ['5511999998888', '5521988887777', '5531977776666']

    // 6 tentativas do MESMO IP (abaixo de limiteTentativas=5 por par ip+telefone) — nenhuma é
    // bloqueada, porque cada telefone tem seu próprio orçamento de 2.
    for (const telefone of telefones) {
      expect(() => limitador.registrarTentativa(ipCompartilhado, telefone)).not.toThrow()
      expect(() => limitador.registrarTentativa(ipCompartilhado, telefone)).not.toThrow()
    }

    // Negativo pareado: o orçamento do primeiro telefone está esgotado (2/2) e a 3ª tentativa
    // dele bloqueia, mesmo tendo sobrado folga na dimensão ip+telefone (2 de 5).
    expect(() => limitador.registrarTentativa(ipCompartilhado, telefones[0])).toThrow(
      ErroDominioAgendamento
    )
  })

  it('tentativa rejeitada pela dimensão ip+telefone não consome o orçamento por telefone', () => {
    const limitador = limitarSolicitacaoPublica({
      limiteTentativas: 2,
      limiteTentativasPorTelefone: 3,
      janelaEmMs: 60_000,
    })
    const ipFixo = '203.0.113.40'

    // 2 tentativas aceitas: ip+telefone = 2/2, telefone = 2/3.
    limitador.registrarTentativa(ipFixo, TELEFONE_ALVO)
    limitador.registrarTentativa(ipFixo, TELEFONE_ALVO)

    // Duas rejeições pela dimensão apertada. Se elas contabilizassem, o orçamento por telefone
    // iria a 4/3 — um atacante com um IP forjado esgotaria a dimensão 2 do telefone de um
    // cliente real só apanhando 429 de propósito.
    expect(() => limitador.registrarTentativa(ipFixo, TELEFONE_ALVO)).toThrow(
      ErroDominioAgendamento
    )
    expect(() => limitador.registrarTentativa(ipFixo, TELEFONE_ALVO)).toThrow(
      ErroDominioAgendamento
    )

    // Sobrou exatamente 1 no orçamento por telefone (2 de 3 consumidos).
    expect(() => limitador.registrarTentativa('198.51.100.9', TELEFONE_ALVO)).not.toThrow()
    expect(() => limitador.registrarTentativa('198.51.100.10', TELEFONE_ALVO)).toThrow(
      ErroDominioAgendamento
    )
  })
})

describe('limitadorAntiabusoPublico (singleton de processo)', () => {
  // CAUSA-RAIZ: o contador vive no closure da instância retornada pela fábrica, então o limitador
  // só freia abuso se a MESMA instância for reusada entre requisições. Enquanto o módulo exportava
  // apenas a fábrica, um Route Handler que a chamasse por requisição zeraria o contador toda vez —
  // antiabuso silenciosamente inoperante, sem teste vermelho. Este teste fixa o invariante do
  // símbolo que a produção consome: chamadas independentes ACUMULAM na mesma contagem, e o
  // singleton carrega a configuração de produção (5 tentativas / 60s de CONFIGURACAO_PADRAO).
  it('acumula tentativas entre chamadas independentes e bloqueia na 6ª com o erro público de limite', () => {
    const ipDoTeste = '203.0.113.77'
    const telefoneDoTeste = '5561988888888'

    // As 5 tentativas do default de produção passam — cada chamada é um "request" distinto sobre
    // a mesma instância importada.
    for (let tentativa = 1; tentativa <= 5; tentativa += 1) {
      expect(() =>
        limitadorAntiabusoPublico.registrarTentativa(ipDoTeste, telefoneDoTeste)
      ).not.toThrow()
    }

    // A 6ª prova o acúmulo: se cada chamada recebesse um contador novo, esta também passaria.
    let erroCapturado: unknown
    try {
      limitadorAntiabusoPublico.registrarTentativa(ipDoTeste, telefoneDoTeste)
    } catch (erro) {
      erroCapturado = erro
    }

    expect(erroCapturado).toBeInstanceOf(ErroDominioAgendamento)
    const erro = erroCapturado as ErroDominioAgendamento
    expect(erro.codigo).toBe('LIMITE_ANTIABUSO')
    expect(erro.status).toBe(429)
    expect(erro.message).toBe(
      'Não foi possível concluir sua solicitação. Tente novamente mais tarde.'
    )
  })
})
