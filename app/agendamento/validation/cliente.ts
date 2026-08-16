/**
 * Validação e normalização puras de identificação do cliente (nome/telefone).
 *
 * Fonte de verdade: `docs/specs/features/agendamento-cliente/v1/tech_spec.md` (§10.3).
 * Funções puras, sem I/O — usadas tanto pela UI (feedback imediato) quanto pelo
 * BFF (validação obrigatória de servidor), conforme §10.3 da Tech Spec.
 */

/** Erro tipado de validação de telefone — nunca um `Error` genérico. */
export interface ErroTelefoneCliente {
  campo: 'telefone'
  codigo: 'TELEFONE_VAZIO' | 'TELEFONE_FORMATO_INVALIDO'
  mensagem: string
}

/** Resultado da validação de telefone: sucesso carrega o valor já normalizado. */
export type ResultadoValidacaoTelefone =
  | { valido: true; telefoneNormalizado: string }
  | { valido: false; erro: ErroTelefoneCliente }

/** Erro tipado de validação de nome — nunca um `Error` genérico. */
export interface ErroNomeCliente {
  campo: 'nome'
  codigo: 'NOME_VAZIO' | 'NOME_MUITO_CURTO' | 'NOME_MUITO_LONGO' | 'NOME_CONTEUDO_INVALIDO'
  mensagem: string
}

/** Resultado da validação de nome: sucesso carrega o valor já normalizado (trim). */
export type ResultadoValidacaoNome =
  | { valido: true; nomeNormalizado: string }
  | { valido: false; erro: ErroNomeCliente }

/**
 * Comprimento mínimo aceito para o nome do cliente após normalização.
 * Decisão de sênior (Tech Spec não define limite numérico): 2 caracteres é o
 * menor valor que ainda distingue um nome de uma tecla solta, sem recusar
 * abreviações/nomes curtos legítimos.
 */
const NOME_MIN_LENGTH = 2

/**
 * Comprimento máximo aceito para o nome do cliente.
 * Decisão de sênior (Tech Spec não define limite numérico): 80 caracteres
 * comporta nomes completos compostos reais e ainda protege payload/UI de
 * entradas anormais.
 */
const NOME_MAX_LENGTH = 80

/** Sinaliza tentativa de injeção de HTML/script no campo de nome (RN de segurança). */
const PADRAO_CONTEUDO_ABUSIVO = /[<>]|javascript:/i

/**
 * Normaliza um telefone brasileiro para dígitos puros com DDI `55` (ex.: `5561999999999`).
 * Função pura de transformação de formato — não valida DDD/tamanho; ver `validarTelefoneCliente`.
 */
export function normalizarTelefoneBrasileiro(telefoneBruto: string): string {
  const digitos = telefoneBruto.replace(/\D/g, '')
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    return digitos
  }
  return `55${digitos}`
}

/**
 * Valida e normaliza o telefone informado pelo cliente.
 * Formato aceito após normalização: DDI `55` + DDD (2 dígitos, `11`-`99`) +
 * número local de 8 dígitos (fixo) ou 9 dígitos iniciando em `9` (celular).
 */
export function validarTelefoneCliente(telefoneBruto: string): ResultadoValidacaoTelefone {
  if (!telefoneBruto || !telefoneBruto.trim()) {
    return {
      valido: false,
      erro: { campo: 'telefone', codigo: 'TELEFONE_VAZIO', mensagem: 'Informe um telefone.' },
    }
  }

  const telefoneNormalizado = normalizarTelefoneBrasileiro(telefoneBruto)
  const match = /^55([1-9][1-9])(\d{8,9})$/.exec(telefoneNormalizado)

  if (!match) {
    return {
      valido: false,
      erro: {
        campo: 'telefone',
        codigo: 'TELEFONE_FORMATO_INVALIDO',
        mensagem: 'Informe um telefone válido com DDD.',
      },
    }
  }

  const numeroLocal = match[2]
  if (numeroLocal.length === 9 && numeroLocal[0] !== '9') {
    return {
      valido: false,
      erro: {
        campo: 'telefone',
        codigo: 'TELEFONE_FORMATO_INVALIDO',
        mensagem: 'Informe um telefone válido com DDD.',
      },
    }
  }

  return { valido: true, telefoneNormalizado }
}

/**
 * Valida e normaliza o nome informado pelo cliente.
 * Normalização: colapsa espaços internos e remove espaços nas extremidades.
 * Rejeita nome vazio, abaixo do mínimo, acima do máximo ou com conteúdo de
 * HTML/script.
 */
export function validarNomeCliente(nomeBruto: string): ResultadoValidacaoNome {
  const nomeNormalizado = nomeBruto.replace(/\s+/g, ' ').trim()

  if (!nomeNormalizado) {
    return {
      valido: false,
      erro: { campo: 'nome', codigo: 'NOME_VAZIO', mensagem: 'Informe seu nome.' },
    }
  }

  if (PADRAO_CONTEUDO_ABUSIVO.test(nomeNormalizado)) {
    return {
      valido: false,
      erro: {
        campo: 'nome',
        codigo: 'NOME_CONTEUDO_INVALIDO',
        mensagem: 'Nome contém caracteres não permitidos.',
      },
    }
  }

  if (nomeNormalizado.length < NOME_MIN_LENGTH) {
    return {
      valido: false,
      erro: { campo: 'nome', codigo: 'NOME_MUITO_CURTO', mensagem: 'Informe um nome válido.' },
    }
  }

  if (nomeNormalizado.length > NOME_MAX_LENGTH) {
    return {
      valido: false,
      erro: {
        campo: 'nome',
        codigo: 'NOME_MUITO_LONGO',
        mensagem: 'Nome excede o limite de caracteres.',
      },
    }
  }

  return { valido: true, nomeNormalizado }
}
