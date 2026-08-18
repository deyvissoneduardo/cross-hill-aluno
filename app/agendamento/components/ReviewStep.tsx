'use client'

import { InlineBanner } from '@/components/ui/InlineBanner'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { SummaryList } from '@/components/ui/SummaryList'
import { agendamentosRepository } from '../repositories/agendamentosRepository'
import { useAppointmentFlow } from '../state/AppointmentProvider'
import type { CriarSolicitacaoAgendamentoDTO, ErroRepository } from '../types'

const MENSAGEM_FALHA_ENVIO = 'Não foi possível concluir sua solicitação. Tente novamente.'
const MENSAGEM_ANTIABUSO = 'Não foi possível concluir sua solicitação. Tente novamente mais tarde.'
const MENSAGEM_DUPLICIDADE = 'Você já possui um agendamento para este dia.'

export function ReviewStep() {
  const { state, dispatch } = useAppointmentFlow()
  const { identification, selection, isSubmitting, submitError } = state

  if (!identification || !selection.profissional || !selection.dia || !selection.horario) {
    return <InlineBanner tone="warning">Escolha profissional, dia e horário antes de revisar.</InlineBanner>
  }

  const telefoneExibicao = formatarTelefoneExibicao(identification.telefoneNormalizado)
  const resumo = [
    { label: 'Nome', value: identification.nomeCliente },
    { label: 'Telefone', value: telefoneExibicao },
    { label: 'Profissional', value: selection.profissional.nome },
    { label: 'Data', value: selection.dia.label },
    { label: 'Horário', value: selection.horario.horario },
  ]
  const acaoErro =
    submitError === MENSAGEM_DUPLICIDADE
      ? undefined
      : { label: 'Tentar novamente', onClick: submit }

  async function submit() {
    if (!identification || !selection.profissional || !selection.dia || !selection.horario) return

    const payload: CriarSolicitacaoAgendamentoDTO = {
      nomeCliente: identification.nomeCliente,
      telefoneNormalizado: identification.telefoneNormalizado,
      telefoneExibicao,
      profissionalId: selection.profissional.id,
      data: selection.dia.data,
      horario: selection.horario.horario,
    }

    dispatch({ type: 'SUBMIT_START' })
    const resultado = await agendamentosRepository.criar(payload)

    if (!resultado.ok) {
      dispatch({ type: 'SUBMIT_FAILURE', payload: mensagemParaErro(resultado.erro) })
      return
    }

    dispatch({ type: 'SUBMIT_SUCCESS', payload: resultado.dados })
  }

  return (
    <div className="flex flex-col gap-5">
      <SummaryList items={resumo} />

      {submitError ? (
        <InlineBanner tone="error" action={acaoErro}>
          {submitError}
        </InlineBanner>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <SecondaryButton disabled={isSubmitting} onClick={() => dispatch({ type: 'BACK' })}>
          Voltar
        </SecondaryButton>
        <PrimaryButton loading={isSubmitting} onClick={submit}>
          Solicitar agendamento
        </PrimaryButton>
      </div>
    </div>
  )
}

function mensagemParaErro(erro: ErroRepository): string {
  if (erro.tipo === 'TELEFONE_DUPLICADO_NO_DIA') return MENSAGEM_DUPLICIDADE
  if (erro.tipo === 'LIMITE_ANTIABUSO') return MENSAGEM_ANTIABUSO
  return MENSAGEM_FALHA_ENVIO
}

function formatarTelefoneExibicao(telefoneNormalizado: string): string {
  const digitos = telefoneNormalizado.replace(/\D/g, '')
  const local = digitos.startsWith('55') ? digitos.slice(2) : digitos

  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  }
  return telefoneNormalizado
}
