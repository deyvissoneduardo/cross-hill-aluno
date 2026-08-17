/**
 * Route Handler público: cria uma Solicitação de Agendamento (tech_spec.md §7.1, §8.3, §9,
 * §10.2.1, §10.3).
 *
 * Fluxo, nesta ordem (§8.3, §10.2.1):
 * 1. Parseia e valida o payload. Os campos de slot (`profissionalId`/`data`/`horario`) passam por
 *    `validarCamposDeSlot`, que exige FORMA além de presença — eles compõem o endereço dos
 *    documentos que a transação vai ler, então texto livre do cliente jamais chega ao Firestore.
 *    Nome (`validarNomeCliente`) e telefone
 *    (`validarTelefoneCliente`, que também normaliza) são REVALIDADOS a partir de
 *    `telefoneExibicao` (o valor mascarado/digitado que o cliente exibiu), mesmo que o corpo
 *    já traga um `telefoneNormalizado` calculado no browser. O servidor nunca confia no client:
 *    o `telefoneNormalizado` usado no antiabuso e na transação é sempre o recomputado aqui —
 *    o campo `telefoneNormalizado` eventualmente enviado no corpo é ignorado, e o
 *    `telefoneExibicao` PERSISTIDO é derivado (`formatarTelefoneExibicao`) do normalizado, não o
 *    texto do cliente (ver o comentário no ponto de chamada). Payload inválido
 *    (nome/telefone ausente ou malformado, campo obrigatório faltando) retorna 400 via
 *    `erroPayloadInvalido` (T6) e NUNCA chega ao antiabuso nem à transação.
 * 2. Antiabuso (`limitadorAntiabusoPublico`, T6) — aplicado ANTES da transação.
 * 3. Transação (`criarSolicitacaoAgendamento`, T4, via `agendamentoStore`) — erros de domínio
 *    (`SlotIndisponivelError`, `TelefoneDuplicadoNoDiaError`) são mapeados por
 *    `mapearErroDominioAgendamento` (T6); a mensagem interna do erro de domínio NUNCA vaza —
 *    a resposta pública usa somente `codigo`/`status`/mensagem de `ErroDominioAgendamento`.
 */
import {
  formatarTelefoneExibicao,
  validarNomeCliente,
  validarTelefoneCliente,
} from '@/app/agendamento/validation/cliente'
import { criarSolicitacaoAgendamento } from '@/lib/firebase/agendamentoStore'
import {
  ErroDominioAgendamento,
  erroPayloadInvalido,
  erroServidor,
  mapearErroDominioAgendamento,
} from './errors'
import { limitadorAntiabusoPublico } from './rateLimit'

/** IP desconhecido não deve impedir o antiabuso de funcionar — cai numa chave estável própria. */
const IP_DESCONHECIDO = 'desconhecido'

/**
 * Forma plausível de endereço IP (IPv4, IPv6 ou IPv4 com porta): apenas os caracteres que um
 * endereço pode conter, no comprimento máximo de um IPv6 textual (45). Não é um parser de IP —
 * é um limite de forma, ver a nota de confiança em `ipOrigem()`.
 */
const FORMATO_IP_PLAUSIVEL = /^[0-9a-f.:]{3,45}$/i

/**
 * IP de origem para a chave do antiabuso (§10.2.1). Nunca é incluído na resposta pública.
 * `x-forwarded-for` pode conter uma cadeia "cliente, proxy1, proxy2" — o primeiro valor é a
 * origem real da requisição.
 *
 * ⚠️ SUPOSIÇÃO DE CONFIANÇA (best-effort, NÃO uma garantia) — `x-forwarded-for` é um header HTTP
 * comum, escrito pelo próprio cliente. Ele só corresponde à origem real quando uma camada de
 * infraestrutura confiável à frente (proxy reverso, CDN, load balancer da plataforma de deploy)
 * REESCREVE o header a cada requisição. Este repositório não declara plataforma de deploy
 * (nem o `tech_spec.md` §10.2.1 nem o `package.json`), então essa camada é assumida, não
 * verificada — e enquanto não for verificada, o valor devolvido aqui é uma pista, não uma
 * identidade.
 *
 * Raio do risco residual: sem proxy confiável, um cliente malicioso rotaciona o header a cada
 * requisição e a dimensão `ip+telefone` do antiabuso passa a ver sempre um contador zerado, isto
 * é, deixa de frear qualquer coisa. É exatamente por isso que `rateLimit.ts` mantém uma SEGUNDA
 * dimensão que ignora o IP (limite por `telefoneNormalizado` sozinho): o freio do endpoint não
 * pode depender só de um dado que o atacante escolhe. Ver o JSDoc de `rateLimit.ts` para o que
 * ainda escapa (rotação simultânea de IP e telefone) e por quê.
 *
 * A validação de forma abaixo não torna o header confiável — ela impede que texto arbitrário do
 * cliente (inclusive megabytes dele) vire chave do `Map` de contagem do limitador. Valor que não
 * tenha forma de IP é tratado como IP desconhecido.
 */
function ipOrigem(request: Request): string {
  const encaminhadoPor = request.headers.get('x-forwarded-for')
  if (!encaminhadoPor) {
    return IP_DESCONHECIDO
  }
  const primeiroDaCadeia = encaminhadoPor.split(',')[0]?.trim() ?? ''
  return FORMATO_IP_PLAUSIVEL.test(primeiroDaCadeia) ? primeiroDaCadeia : IP_DESCONHECIDO
}

/** Normaliza o contrato de resposta pública de erro: mesmo formato para 400/409/429/500. */
function respostaDeErro(erro: ErroDominioAgendamento): Response {
  return Response.json({ error: erro.message, codigo: erro.codigo }, { status: erro.status })
}

/** `valor` como texto não vazio (após trim) ou `null` — usado para os campos de slot/rota. */
function textoObrigatorio(valor: unknown): string | null {
  if (typeof valor !== 'string') {
    return null
  }
  const texto = valor.trim()
  return texto ? texto : null
}

/** Forma de `data` no contrato de tipos da feature (`YYYY-MM-DD`) — ver `CriarSolicitacaoAgendamentoDTO`. */
const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/

/** Forma de `horario` no contrato de tipos da feature (`HH:mm`). */
const FORMATO_HORARIO = /^\d{2}:\d{2}$/

/**
 * Forma de `profissionalId`: qualquer texto SEM `/`, limitado em comprimento. O `/` é recusado
 * porque este valor é usado como ID de documento Firestore e `.doc()` trata `/` como separador de
 * path — `prof-1/sub/x` endereçaria um documento em subcoleção, não o ID pretendido. 128 é folgado
 * para os dois formatos que a coleção usa na prática (ID gerado pelo Firestore, 20 caracteres, ou
 * slug curto definido pelo administrador) e mantém texto de tamanho anormal fora da chave de
 * leitura. Não é uma allowlist de charset de propósito: o administrador cria esses IDs, e recusar
 * caracteres legítimos aqui quebraria dados reais sem fechar nenhum vetor.
 */
const FORMATO_PROFISSIONAL_ID = /^[^/]{1,128}$/

/**
 * `data` é uma data de calendário REAL, não só quatro-dois-dois dígitos: `2026-13-99` satisfaz a
 * forma e não existe. Round-trip por `Date.UTC` (UTC para não depender do fuso do servidor)
 * rejeita mês/dia fora de faixa, porque `Date` normaliza silenciosamente o excedente (mês 13 vira
 * janeiro do ano seguinte) e o valor normalizado deixa de bater com o que foi enviado.
 */
function ehDataDeCalendario(data: string): boolean {
  if (!FORMATO_DATA.test(data)) {
    return false
  }
  const [ano, mes, dia] = data.split('-').map(Number)
  const referencia = new Date(Date.UTC(ano, mes - 1, dia))
  return (
    referencia.getUTCFullYear() === ano &&
    referencia.getUTCMonth() === mes - 1 &&
    referencia.getUTCDate() === dia
  )
}

/** `horario` é uma hora real do dia — `99:99` satisfaz a forma `HH:mm` e não existe. */
function ehHorarioDoDia(horario: string): boolean {
  if (!FORMATO_HORARIO.test(horario)) {
    return false
  }
  const [hora, minuto] = horario.split(':').map(Number)
  return hora <= 23 && minuto <= 59
}

/** Campos de slot já validados — o que segue para o antiabuso e para a transação. */
interface CamposDeSlot {
  profissionalId: string
  data: string
  horario: string
}

/** Resultado discriminado, no mesmo padrão dos validadores de `validation/cliente.ts` (T3). */
type ResultadoCamposDeSlot =
  | { valido: true; campos: CamposDeSlot }
  | { valido: false; mensagem: string }

/**
 * Portão de formato dos campos de slot (§10.3, o mesmo princípio já aplicado a nome/telefone: o
 * servidor nunca confia na validação do client).
 *
 * Não é validação decorativa. Estes três campos não são apenas valores procurados — eles compõem
 * o ENDEREÇO dos documentos lidos: `profissionalId` vira ID de documento e
 * `{profissionalId}_{data}` vira o ID do documento de disponibilidade (`agendamentoStore.ts`).
 * Sem portão de forma, quem escolhe o endereço é o cliente. Recusar aqui mantém esses valores
 * fora do antiabuso (não viram chave do limitador) e fora da transação.
 *
 * A porta de dados repete o guard de `/` por defesa em profundidade — este portão é a primeira
 * linha, não a única.
 */
function validarCamposDeSlot(corpo: Record<string, unknown>): ResultadoCamposDeSlot {
  const profissionalId = textoObrigatorio(corpo.profissionalId)
  const data = textoObrigatorio(corpo.data)
  const horario = textoObrigatorio(corpo.horario)
  if (!profissionalId || !data || !horario) {
    return { valido: false, mensagem: 'Informe profissional, data e horário.' }
  }

  if (
    !FORMATO_PROFISSIONAL_ID.test(profissionalId) ||
    !ehDataDeCalendario(data) ||
    !ehHorarioDoDia(horario)
  ) {
    // Mensagem única para os três campos: a UI já impede a montagem de um slot inválido (o
    // cliente escolhe profissional/dia/horário de listas do servidor), então quem chega aqui não
    // é um usuário a ser orientado — não há por que devolver qual campo/regra falhou.
    return { valido: false, mensagem: 'Profissional, data ou horário inválidos.' }
  }

  return { valido: true, campos: { profissionalId, data, horario } }
}

export async function POST(request: Request) {
  let corpo: unknown
  try {
    corpo = await request.json()
  } catch {
    return respostaDeErro(erroPayloadInvalido('Payload inválido.'))
  }

  if (!corpo || typeof corpo !== 'object') {
    return respostaDeErro(erroPayloadInvalido('Payload inválido.'))
  }
  const corpoBruto = corpo as Record<string, unknown>

  const resultadoSlot = validarCamposDeSlot(corpoBruto)
  if (!resultadoSlot.valido) {
    return respostaDeErro(erroPayloadInvalido(resultadoSlot.mensagem))
  }
  const { profissionalId, data, horario } = resultadoSlot.campos

  // Revalidação obrigatória de servidor (§10.3): nunca confia na validação do client.
  const nomeClienteBruto = typeof corpoBruto.nomeCliente === 'string' ? corpoBruto.nomeCliente : ''
  const resultadoNome = validarNomeCliente(nomeClienteBruto)
  if (!resultadoNome.valido) {
    return respostaDeErro(erroPayloadInvalido(resultadoNome.erro.mensagem))
  }

  // `telefoneExibicao` é o valor mascarado/digitado pelo cliente — é ele, não o
  // `telefoneNormalizado` do corpo, que serve de ENTRADA para a revalidação/renormalização.
  // Entrada é tudo que ele é: o texto bruto não é persistido (ver o DTO da transação abaixo).
  const telefoneExibicaoBruto =
    typeof corpoBruto.telefoneExibicao === 'string' ? corpoBruto.telefoneExibicao : ''
  const resultadoTelefone = validarTelefoneCliente(telefoneExibicaoBruto)
  if (!resultadoTelefone.valido) {
    return respostaDeErro(erroPayloadInvalido(resultadoTelefone.erro.mensagem))
  }

  try {
    limitadorAntiabusoPublico.registrarTentativa(
      ipOrigem(request),
      resultadoTelefone.telefoneNormalizado
    )
  } catch (erro) {
    if (erro instanceof ErroDominioAgendamento) {
      return respostaDeErro(erro)
    }
    // Falha inesperada do limitador (não deveria ocorrer pelo contrato de `rateLimit.ts`) nunca
    // deve travar a criação nem vazar detalhe interno — mesma disciplina do catch-all abaixo.
    console.error('[POST /api/public/agendamentos] falha inesperada no antiabuso', erro)
    return respostaDeErro(erroServidor())
  }

  try {
    const solicitacao = await criarSolicitacaoAgendamento({
      nomeCliente: resultadoNome.nomeNormalizado,
      telefoneNormalizado: resultadoTelefone.telefoneNormalizado,
      // DERIVADO do telefone já validado — nunca `telefoneExibicaoBruto`. O texto bruto só
      // serviu de entrada para a validação, que descarta não-dígitos: ele próprio nunca passou
      // por portão algum (sem limite de tamanho nem de conteúdo) e não pode ser persistido.
      telefoneExibicao: formatarTelefoneExibicao(resultadoTelefone.telefoneNormalizado),
      profissionalId,
      data,
      horario,
    })
    return Response.json(solicitacao)
  } catch (erro) {
    // Erro de domínio (`SlotIndisponivelError`/`TelefoneDuplicadoNoDiaError`) ou falha inesperada
    // — em qualquer caso, nunca vaza `error.message` bruto do erro interno ao cliente público.
    console.error(
      '[POST /api/public/agendamentos] falha ao criar solicitação de agendamento',
      erro
    )
    return respostaDeErro(mapearErroDominioAgendamento(erro))
  }
}
