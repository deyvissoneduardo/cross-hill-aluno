import { describe, expect, it } from 'vitest'
import {
  formatarTelefoneExibicao,
  formatarTelefoneDigitado,
  normalizarTelefoneBrasileiro,
  validarNomeCliente,
  validarTelefoneCliente,
} from '../cliente'

describe('normalizarTelefoneBrasileiro', () => {
  it.each([
    ['(61) 99999-9999', '5561999999999'],
    ['+55 21 98888-7777', '5521988887777'],
    ['11 3333-4444', '551133334444'],
  ])('normaliza "%s" para dígitos com DDI 55: "%s"', (entrada, esperado) => {
    expect(normalizarTelefoneBrasileiro(entrada)).toBe(esperado)
  })
})

describe('formatarTelefoneDigitado', () => {
  it.each([
    ['6', '(6'],
    ['61999', '(61) 999'],
    ['61999999999', '(61) 99999-9999'],
    ['6133334444', '(61) 3333-4444'],
    ['61abc99999-9999xyz123', '(61) 99999-9999'],
  ])('CT-043: mascara e limita "%s" como "%s"', (entrada, esperado) => {
    expect(formatarTelefoneDigitado(entrada)).toBe(esperado)
  })
})

describe('validarTelefoneCliente', () => {
  it.each([
    ['(61) 99999-9999', '5561999999999'],
    ['+55 (61) 99999-9999', '5561999999999'],
    ['(11) 3333-4444', '551133334444'],
  ])(
    'CT-004: aceita telefone válido "%s" e retorna normalizado "%s"',
    (entrada, telefoneNormalizadoEsperado) => {
      const resultado = validarTelefoneCliente(entrada)

      expect(resultado).toEqual({ valido: true, telefoneNormalizado: telefoneNormalizadoEsperado })
    }
  )

  it.each([
    ['', 'TELEFONE_VAZIO'],
    ['   ', 'TELEFONE_VAZIO'],
    ['99999', 'TELEFONE_FORMATO_INVALIDO'],
    ['abctelefone', 'TELEFONE_FORMATO_INVALIDO'],
    ['(61) 8888-777', 'TELEFONE_FORMATO_INVALIDO'],
    ['61888887777888', 'TELEFONE_FORMATO_INVALIDO'],
    ['(61) 18888-7777', 'TELEFONE_FORMATO_INVALIDO'],
  ])(
    'CT-004: rejeita telefone inválido "%s" com código "%s"',
    (entrada, codigoEsperado) => {
      const resultado = validarTelefoneCliente(entrada)

      expect(resultado.valido).toBe(false)
      if (resultado.valido) throw new Error('esperado inválido')
      expect(resultado.erro).toEqual({
        campo: 'telefone',
        codigo: codigoEsperado,
        mensagem: expect.any(String),
      })
    }
  )
})

describe('formatarTelefoneExibicao', () => {
  it.each([
    ['5561999999999', '(61) 99999-9999'],
    ['5511999998888', '(11) 99999-8888'],
    ['551133334444', '(11) 3333-4444'],
  ])('deriva a máscara de exibição de "%s": "%s"', (telefoneNormalizado, esperado) => {
    expect(formatarTelefoneExibicao(telefoneNormalizado)).toBe(esperado)
  })

  it('é a inversa de normalizarTelefoneBrasileiro: normalizar a máscara devolve a entrada', () => {
    const telefoneNormalizado = '5561999999999'

    const exibicao = formatarTelefoneExibicao(telefoneNormalizado)

    expect(exibicao).toBe('(61) 99999-9999')
    expect(normalizarTelefoneBrasileiro(exibicao)).toBe(telefoneNormalizado)
  })

  it('nunca ecoa texto livre: entrada fora do contrato devolve só dígitos, limitados a 13', () => {
    // Chamador que não passou por `validarTelefoneCliente`. A saída é limitada por construção —
    // é essa propriedade que impede o campo persistido de ter tamanho arbitrário.
    const entradaAbusiva = `<script>${'9'.repeat(50_000)}</script>`

    const exibicao = formatarTelefoneExibicao(entradaAbusiva)

    expect(exibicao).toBe('9999999999999')
    expect(exibicao).toHaveLength(13)
    expect(exibicao).not.toContain('script')
  })
})

describe('validarNomeCliente', () => {
  it.each([
    ['Maria Silva', 'Maria Silva'],
    ['  João   Pereira  ', 'João Pereira'],
    ['Al', 'Al'],
    ['A'.repeat(80), 'A'.repeat(80)],
  ])('CT-029: aceita nome válido "%s" e normaliza para "%s"', (entrada, nomeNormalizadoEsperado) => {
    const resultado = validarNomeCliente(entrada)

    expect(resultado).toEqual({ valido: true, nomeNormalizado: nomeNormalizadoEsperado })
  })

  it.each([
    ['', 'NOME_VAZIO'],
    ['   ', 'NOME_VAZIO'],
    ['A', 'NOME_MUITO_CURTO'],
    ['<script>alert(1)</script>', 'NOME_CONTEUDO_INVALIDO'],
    ['Maria<img src=x onerror=alert(1)>', 'NOME_CONTEUDO_INVALIDO'],
    ['javascript:alert(1)', 'NOME_CONTEUDO_INVALIDO'],
    ['A'.repeat(81), 'NOME_MUITO_LONGO'],
  ])('CT-029: rejeita nome inválido "%s" com código "%s"', (entrada, codigoEsperado) => {
    const resultado = validarNomeCliente(entrada)

    expect(resultado.valido).toBe(false)
    if (resultado.valido) throw new Error('esperado inválido')
    expect(resultado.erro).toEqual({
      campo: 'nome',
      codigo: codigoEsperado,
      mensagem: expect.any(String),
    })
  })
})
