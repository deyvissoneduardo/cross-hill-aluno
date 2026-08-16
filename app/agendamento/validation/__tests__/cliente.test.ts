import { describe, expect, it } from 'vitest'
import {
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
