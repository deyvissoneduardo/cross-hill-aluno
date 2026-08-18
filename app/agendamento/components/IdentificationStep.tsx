'use client'

import { FormEvent, useState } from 'react'

import { FormField } from '@/components/ui/FormField'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import {
  formatarTelefoneDigitado,
  validarNomeCliente,
  validarTelefoneCliente,
} from '../validation/cliente'

interface IdentificationErrors {
  nome?: string
  telefone?: string
}

export interface IdentificationSubmitPayload {
  nomeCliente: string
  telefoneNormalizado: string
}

export interface IdentificationStepProps {
  onContinue: (payload: IdentificationSubmitPayload) => void
}

export function IdentificationStep({ onContinue }: IdentificationStepProps) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [errors, setErrors] = useState<IdentificationErrors>({})
  const identificacaoValida = validarNomeCliente(nome).valido && validarTelefoneCliente(telefone).valido

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const resultadoNome = validarNomeCliente(nome)
    const resultadoTelefone = validarTelefoneCliente(telefone)
    const nextErrors: IdentificationErrors = {}

    if (!resultadoNome.valido) {
      nextErrors.nome = resultadoNome.erro.mensagem
    }
    if (!resultadoTelefone.valido) {
      nextErrors.telefone = resultadoTelefone.erro.mensagem
    }

    setErrors(nextErrors)

    if (!resultadoNome.valido || !resultadoTelefone.valido) {
      return
    }

    onContinue({
      nomeCliente: resultadoNome.nomeNormalizado,
      telefoneNormalizado: resultadoTelefone.telefoneNormalizado,
    })
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <FormField
        id="nome-cliente"
        label="Nome"
        value={nome}
        onChange={(value) => {
          setNome(value)
          if (errors.nome) {
            setErrors((current) => ({ ...current, nome: undefined }))
          }
        }}
        autoComplete="name"
        error={errors.nome}
      />

      <FormField
        id="telefone-cliente"
        label="Telefone"
        value={telefone}
        onChange={(value) => {
          setTelefone(formatarTelefoneDigitado(value))
          if (errors.telefone) {
            setErrors((current) => ({ ...current, telefone: undefined }))
          }
        }}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="(61) 99999-9999"
        maxLength={15}
        error={errors.telefone}
      />

      <PrimaryButton type="submit" disabled={!identificacaoValida}>
        Continuar
      </PrimaryButton>
    </form>
  )
}
