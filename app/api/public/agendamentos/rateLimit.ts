/**
 * Limitador antiabuso do POST `/api/public/agendamentos`.
 *
 * Fonte de verdade: `docs/specs/features/agendamento-cliente/v1/tech_spec.md` §10.2.1. O
 * endpoint não tem autenticação, então o único freio contra abuso é este limite operacional,
 * dentro de uma janela deslizante curta. Route Handlers (T7/T8) importam o singleton
 * `limitadorAntiabusoPublico` (no fim do arquivo) e chamam `registrarTentativa` ANTES da
 * transação Firestore; ao exceder o limite, o limitador lança `ErroDominioAgendamento`
 * (`LIMITE_ANTIABUSO`) com mensagem genérica — nunca expõe contador, janela ou os valores de
 * IP/telefone ao cliente (§10.2.1).
 *
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * DUAS DIMENSÕES DE LIMITE — por que não basta `IP + telefone`
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * O §10.2.1 pede limite "por combinação de IP de origem e `telefoneNormalizado`". Essa chave
 * sozinha, porém, é INTEIRAMENTE controlada pelo cliente HTTP: o telefone vem do payload e o IP
 * de origem só pode ser lido de `x-forwarded-for` (ver `ipOrigem()` em `route.ts`), um header
 * que o cliente forja livremente quando não há proxy confiável reescrevendo-o. Rotacionar o
 * header a cada requisição dava, portanto, um contador zerado por requisição — o freio existia
 * no papel e era nulo na prática.
 *
 * Por isso `registrarTentativa` avalia DUAS dimensões independentes por tentativa:
 *
 *  1. `ip+telefone` — apertada (`limiteTentativas`). É a do §10.2.1; continua sendo o freio
 *     preciso quando o IP é confiável (proxy/CDN à frente) ou simplesmente não é forjado.
 *  2. `telefone` — mais generosa (`limiteTentativasPorTelefone`), mas finita. NÃO depende do IP,
 *     então sobrevive à rotação do header: um flood com `x-forwarded-for` rotativo continua
 *     limitado a `limiteTentativasPorTelefone` escritas por janela para cada telefone.
 *
 * Uma tentativa só é contabilizada quando passa em TODAS as dimensões — uma tentativa já
 * rejeitada não consome o orçamento das demais, senão bastaria um IP forjado martelando o
 * telefone de um cliente real para esgotar a dimensão 2 dele (amplificação de negação de
 * serviço contra um número específico).
 *
 * Risco residual assumido (fora do escopo desta camada): quem rotaciona IP **e** telefone a cada
 * requisição ainda escapa das duas dimensões. Conter isso exigiria prova de posse do número
 * (OTP), CAPTCHA ou proof-of-work — nenhum deles previsto na v1. O dano fica limitado pelo que a
 * transação de T4 já garante (unicidade de slot e duplicidade diária por telefone).
 *
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * NOTA TÉCNICA — armazenamento in-memory (débito consciente, mesmo padrão de T4)
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * O contador vive num `Map` local ao processo Node (`tentativasPorChave`), criado por chamada de
 * `limitarSolicitacaoPublica(...)` e, por isso, com tempo de vida igual ao da instância que o
 * fecha — daí o singleton de módulo ser parte do contrato, e não uma conveniência (ver o JSDoc
 * da fábrica). Correto para v1 porque o projeto não tem infraestrutura de
 * emulador/Firestore de teste (mesma situação documentada em `lib/firebase/agendamentoStore.ts`)
 * e porque a v1 roda como processo único. Em produção multi-instância (mais de um processo Node
 * atrás de um load balancer), cada instância teria seu próprio contador e o limite efetivo seria
 * multiplicado pelo número de instâncias. Mitigação futura: mover a contagem para storage
 * compartilhado (coleção Firestore de controle operacional ou Redis) SEM mudar a interface
 * `LimitadorSolicitacaoPublica` exposta abaixo — os Route Handlers continuariam chamando
 * `registrarTentativa(ip, telefoneNormalizado)` normalmente.
 * ────────────────────────────────────────────────────────────────────────────────────────────
 */

import 'server-only'

import { erroLimiteAntiabuso } from './errors'

/**
 * Contrato do limitador consumido pelo Route Handler. Interface mínima e substituível por fake
 * em teste (Lei do seam): testes de T7/T8 podem implementar este contrato com um objeto literal
 * (`{ registrarTentativa: () => {} }` ou uma versão que sempre lança), sem depender da
 * implementação in-memory nem da configuração de janela/limite abaixo.
 */
export interface LimitadorSolicitacaoPublica {
  /**
   * Registra uma tentativa da combinação `ipOrigem` + `telefoneNormalizado`, avaliando as duas
   * dimensões descritas no JSDoc do módulo. Não retorna nada em caso de sucesso (a tentativa foi
   * apenas contabilizada, em todas as dimensões). Lança `ErroDominioAgendamento`
   * (`LIMITE_ANTIABUSO`) quando QUALQUER dimensão excede seu limite na janela atual — e, nesse
   * caso, nenhuma dimensão é contabilizada.
   */
  registrarTentativa(ipOrigem: string, telefoneNormalizado: string): void
}

/** Configuração injetável do limitador — permite testes determinísticos sem depender do relógio real. */
export interface ConfiguracaoLimitadorSolicitacaoPublica {
  /** Máximo de tentativas aceitas na dimensão apertada (IP + telefone) dentro da janela. */
  limiteTentativas: number
  /**
   * Máximo de tentativas aceitas na dimensão que ignora o IP (só `telefoneNormalizado`) dentro
   * da janela. Deve ser mais generoso que `limiteTentativas` — um mesmo cliente legítimo troca
   * de IP sem trocar de telefone (dados móveis ↔ wi-fi, CGNAT) —, mas finito, porque é ele que
   * segura o flood com `x-forwarded-for` rotativo.
   */
  limiteTentativasPorTelefone: number
  /** Duração da janela deslizante, em milissegundos. */
  janelaEmMs: number
  /** Fonte de tempo injetável — testes fixam um relógio determinístico em vez de `Date.now()` direto. */
  agora: () => number
}

/**
 * Default de produção a cada 60 segundos: 5 tentativas por combinação IP+telefone e 15 por
 * telefone (independente de IP). Tech spec não fixa números — decisão de sênior: 5 é baixo o
 * bastante para conter reenvio automatizado e alto o bastante para não bloquear um cliente real
 * corrigindo o formulário algumas vezes; 15 (3×) absorve a troca de rede de um cliente legítimo
 * e ainda teto um flood de IP rotacionado em 15 escritas por minuto para o mesmo telefone.
 */
const CONFIGURACAO_PADRAO: ConfiguracaoLimitadorSolicitacaoPublica = {
  limiteTentativas: 5,
  limiteTentativasPorTelefone: 15,
  janelaEmMs: 60_000,
  agora: () => Date.now(),
}

/**
 * Cria um limitador antiabuso independente (contador próprio, isolado de outras chamadas da
 * fábrica). `configuracao` é parcial e mescla com `CONFIGURACAO_PADRAO` — testes injetam
 * `limiteTentativas`/`janelaEmMs`/`agora` menores para exercitar o limite sem depender de tempo
 * real nem de centenas de chamadas.
 *
 * ⚠️ CICLO DE VIDA — cada chamada devolve um contador VAZIO. Uma instância só limita alguma coisa
 * se sobreviver entre requisições, portanto ela SÓ pode ser criada em escopo de módulo (avaliado
 * uma vez por processo). Chamar esta fábrica dentro do corpo de um Route Handler dá a cada
 * requisição um contador zerado: o código compila, responde 200 e o antiabuso fica silenciosamente
 * inoperante. Por isso a produção NÃO deve chamar esta fábrica — deve importar o singleton
 * `limitadorAntiabusoPublico` abaixo. Use a fábrica apenas em teste (config determinística) ou se
 * um dia existir outro endpoint público que precise de um contador próprio, sempre com a instância
 * guardada em `const` de módulo.
 */
export function limitarSolicitacaoPublica(
  configuracao: Partial<ConfiguracaoLimitadorSolicitacaoPublica> = {}
): LimitadorSolicitacaoPublica {
  const {
    limiteTentativas,
    limiteTentativasPorTelefone,
    janelaEmMs,
    agora,
  }: ConfiguracaoLimitadorSolicitacaoPublica = {
    ...CONFIGURACAO_PADRAO,
    ...configuracao,
  }
  const tentativasPorChave = new Map<string, number[]>()

  return {
    registrarTentativa(ipOrigem: string, telefoneNormalizado: string): void {
      const agoraMs = agora()

      // Prefixo de dimensão na chave para que as duas contagens nunca colidam entre si.
      const dimensoes = [
        { chave: `ip+telefone:${ipOrigem}:${telefoneNormalizado}`, limite: limiteTentativas },
        { chave: `telefone:${telefoneNormalizado}`, limite: limiteTentativasPorTelefone },
      ]

      // Fase 1 — checa TODAS as dimensões antes de contabilizar qualquer uma: tentativa
      // rejeitada não consome orçamento (ver JSDoc do módulo).
      const aContabilizar: { chave: string; tentativasNaJanela: number[] }[] = []
      for (const { chave, limite } of dimensoes) {
        const tentativasNaJanela = (tentativasPorChave.get(chave) ?? []).filter(
          (timestamp) => agoraMs - timestamp < janelaEmMs
        )
        if (tentativasNaJanela.length >= limite) {
          throw erroLimiteAntiabuso()
        }
        aContabilizar.push({ chave, tentativasNaJanela })
      }

      // Fase 2 — só agora a tentativa conta, e conta em todas as dimensões.
      for (const { chave, tentativasNaJanela } of aContabilizar) {
        tentativasNaJanela.push(agoraMs)
        tentativasPorChave.set(chave, tentativasNaJanela)
      }
    },
  }
}

/**
 * Limitador antiabuso do POST `/api/public/agendamentos` — instância única do processo, com a
 * configuração de produção (`CONFIGURACAO_PADRAO`). **É este símbolo que os Route Handlers (T7/T8)
 * importam**; a fábrica acima existe para teste/configuração, não para o caminho de produção.
 *
 * Ser um `const` de escopo de módulo é o que faz o contador sobreviver entre requisições: o módulo
 * é avaliado uma única vez por processo Node e todo handler que o importar compartilha a MESMA
 * contagem. Isso remove do consumidor a decisão de instanciamento — a única forma de zerar o
 * contador por requisição seria chamar a fábrica manualmente, contra o aviso explícito dela.
 *
 * Consequências assumidas (mesmo escopo da NOTA TÉCNICA do topo): o contador reinicia a cada
 * restart do processo — e, em `next dev`, a cada hot reload que reavalia o módulo — e não é
 * compartilhado entre instâncias atrás de um load balancer. Aceitável para v1 (processo único);
 * a mitigação futura (storage compartilhado) troca só o corpo da fábrica, mantendo este símbolo e
 * a interface `LimitadorSolicitacaoPublica` intactos para os handlers.
 */
export const limitadorAntiabusoPublico: LimitadorSolicitacaoPublica = limitarSolicitacaoPublica()
