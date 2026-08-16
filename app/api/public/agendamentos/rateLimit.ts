/**
 * Limitador antiabuso do POST `/api/public/agendamentos`.
 *
 * Fonte de verdade: `docs/specs/features/agendamento-cliente/v1/tech_spec.md` §10.2.1. O
 * endpoint não tem autenticação, então o único freio contra abuso é este limite operacional:
 * combinação de IP de origem + `telefoneNormalizado`, dentro de uma janela deslizante curta.
 * Route Handlers (T7/T8) chamam `registrarTentativa` ANTES da transação Firestore; ao exceder o
 * limite, o limitador lança `ErroDominioAgendamento` (`LIMITE_ANTIABUSO`) com mensagem genérica
 * — nunca expõe contador, janela ou os valores de IP/telefone ao cliente (§10.2.1).
 *
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * NOTA TÉCNICA — armazenamento in-memory (débito consciente, mesmo padrão de T4)
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * O contador vive num `Map` local ao processo Node (`tentativasPorChave`), criado por chamada de
 * `limitarSolicitacaoPublica(...)`. Correto para v1 porque o projeto não tem infraestrutura de
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
   * Registra uma tentativa para a combinação `ipOrigem` + `telefoneNormalizado`. Não retorna
   * nada em caso de sucesso (a tentativa foi apenas contabilizada). Lança
   * `ErroDominioAgendamento` (`LIMITE_ANTIABUSO`) quando a contagem na janela atual excede o
   * limite configurado.
   */
  registrarTentativa(ipOrigem: string, telefoneNormalizado: string): void
}

/** Configuração injetável do limitador — permite testes determinísticos sem depender do relógio real. */
export interface ConfiguracaoLimitadorSolicitacaoPublica {
  /** Máximo de tentativas aceitas por chave (IP + telefone) dentro da janela. */
  limiteTentativas: number
  /** Duração da janela deslizante, em milissegundos. */
  janelaEmMs: number
  /** Fonte de tempo injetável — testes fixam um relógio determinístico em vez de `Date.now()` direto. */
  agora: () => number
}

/**
 * Default de produção: 5 tentativas por combinação IP+telefone a cada 60 segundos. Tech spec
 * não fixa um número — decisão de sênior: baixo o bastante para conter reenvio automatizado,
 * alto o bastante para não bloquear um cliente real corrigindo o formulário algumas vezes.
 */
const CONFIGURACAO_PADRAO: ConfiguracaoLimitadorSolicitacaoPublica = {
  limiteTentativas: 5,
  janelaEmMs: 60_000,
  agora: () => Date.now(),
}

/**
 * Cria um limitador antiabuso independente (contador próprio, isolado de outras chamadas da
 * fábrica). `configuracao` é parcial e mescla com `CONFIGURACAO_PADRAO` — testes injetam
 * `limiteTentativas`/`janelaEmMs`/`agora` menores para exercitar o limite sem depender de tempo
 * real nem de centenas de chamadas.
 */
export function limitarSolicitacaoPublica(
  configuracao: Partial<ConfiguracaoLimitadorSolicitacaoPublica> = {}
): LimitadorSolicitacaoPublica {
  const { limiteTentativas, janelaEmMs, agora }: ConfiguracaoLimitadorSolicitacaoPublica = {
    ...CONFIGURACAO_PADRAO,
    ...configuracao,
  }
  const tentativasPorChave = new Map<string, number[]>()

  return {
    registrarTentativa(ipOrigem: string, telefoneNormalizado: string): void {
      const chave = `${ipOrigem}:${telefoneNormalizado}`
      const agoraMs = agora()
      const tentativasNaJanela = (tentativasPorChave.get(chave) ?? []).filter(
        (timestamp) => agoraMs - timestamp < janelaEmMs
      )

      if (tentativasNaJanela.length >= limiteTentativas) {
        throw erroLimiteAntiabuso()
      }

      tentativasNaJanela.push(agoraMs)
      tentativasPorChave.set(chave, tentativasNaJanela)
    },
  }
}
