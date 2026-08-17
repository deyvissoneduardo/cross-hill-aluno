'use client'

import { useEffect, useState } from 'react'

import { InlineBanner } from '@/components/ui/InlineBanner'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { SelectionCard } from '@/components/ui/SelectionCard'
import { SkeletonBlock } from '@/components/ui/SkeletonBlock'
import { TimeChip } from '@/components/ui/TimeChip'
import { disponibilidadeRepository } from '../repositories/disponibilidadeRepository'
import { profissionaisRepository } from '../repositories/profissionaisRepository'
import { useAppointmentFlow } from '../state/AppointmentProvider'
import type { DiaDisponivel, HorarioDisponivel, Profissional } from '../types'

type LoadState = 'idle' | 'loading' | 'success' | 'error'

interface ResourceState<T> {
  key: string | null
  status: LoadState
  dados: T[]
}

const ERRO_PROFISSIONAIS = 'Não foi possível carregar os profissionais.'
const ERRO_DIAS = 'Não foi possível carregar as datas disponíveis.'
const ERRO_HORARIOS = 'Não foi possível carregar os horários.'
const VAZIO_PROFISSIONAIS = 'Nenhum profissional disponível no momento.'
const VAZIO_DIAS = 'Não há datas disponíveis para este profissional.'
const VAZIO_HORARIOS = 'Não há horários disponíveis nesta data.'

export function ScheduleStep() {
  const { state, dispatch } = useAppointmentFlow()
  const [profissionaisResource, setProfissionaisResource] = useState<ResourceState<Profissional>>({
    key: null,
    status: 'idle',
    dados: [],
  })
  const [diasResource, setDiasResource] = useState<ResourceState<DiaDisponivel>>({
    key: null,
    status: 'idle',
    dados: [],
  })
  const [horariosResource, setHorariosResource] = useState<ResourceState<HorarioDisponivel>>({
    key: null,
    status: 'idle',
    dados: [],
  })
  const [profissionaisRetry, setProfissionaisRetry] = useState(0)
  const [diasRetry, setDiasRetry] = useState(0)
  const [horariosRetry, setHorariosRetry] = useState(0)

  const profissionalSelecionado = state.selection.profissional
  const diaSelecionado = state.selection.dia
  const horarioSelecionado = state.selection.horario
  const podeRevisar = Boolean(profissionalSelecionado && diaSelecionado && horarioSelecionado)
  const profissionaisKey = state.identification
    ? `${state.identification.telefoneNormalizado}:${profissionaisRetry}`
    : null
  const diasKey = profissionalSelecionado ? `${profissionalSelecionado.id}:${diasRetry}` : null
  const horariosKey =
    profissionalSelecionado && diaSelecionado
      ? `${profissionalSelecionado.id}:${diaSelecionado.data}:${horariosRetry}`
      : null
  const profissionaisStatus = statusDoRecurso(profissionaisResource, profissionaisKey)
  const diasStatus = statusDoRecurso(diasResource, diasKey)
  const horariosStatus = statusDoRecurso(horariosResource, horariosKey)
  const profissionais = profissionaisStatus === 'success' ? profissionaisResource.dados : []
  const dias = diasStatus === 'success' ? diasResource.dados : []
  const horarios = horariosStatus === 'success' ? horariosResource.dados : []

  useEffect(() => {
    if (!profissionaisKey) return

    let ativo = true

    profissionaisRepository.listar().then((resultado) => {
      if (!ativo) return
      if (!resultado.ok) {
        setProfissionaisResource({ key: profissionaisKey, status: 'error', dados: [] })
        return
      }
      setProfissionaisResource({ key: profissionaisKey, status: 'success', dados: resultado.dados })
    })

    return () => {
      ativo = false
    }
  }, [profissionaisKey])

  useEffect(() => {
    if (!profissionalSelecionado || !diasKey) return

    let ativo = true

    disponibilidadeRepository.listarDias(profissionalSelecionado.id).then((resultado) => {
      if (!ativo) return
      if (!resultado.ok) {
        setDiasResource({ key: diasKey, status: 'error', dados: [] })
        return
      }
      setDiasResource({ key: diasKey, status: 'success', dados: resultado.dados })
    })

    return () => {
      ativo = false
    }
  }, [profissionalSelecionado, diasKey])

  useEffect(() => {
    if (!profissionalSelecionado || !diaSelecionado || !horariosKey) return

    let ativo = true

    disponibilidadeRepository
      .listarHorarios(profissionalSelecionado.id, diaSelecionado.data)
      .then((resultado) => {
        if (!ativo) return
        if (!resultado.ok) {
          setHorariosResource({ key: horariosKey, status: 'error', dados: [] })
          return
        }
        setHorariosResource({ key: horariosKey, status: 'success', dados: resultado.dados })
      })

    return () => {
      ativo = false
    }
  }, [profissionalSelecionado, diaSelecionado, horariosKey])

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="schedule-profissionais-heading">
        <h2 id="schedule-profissionais-heading" className="text-base font-semibold text-[var(--foreground)]">
          Profissional
        </h2>
        {renderProfissionais()}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="schedule-dias-heading">
        <h2 id="schedule-dias-heading" className="text-base font-semibold text-[var(--foreground)]">
          Dia
        </h2>
        {renderDias()}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="schedule-horarios-heading">
        <h2 id="schedule-horarios-heading" className="text-base font-semibold text-[var(--foreground)]">
          Horário
        </h2>
        {renderHorarios()}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <SecondaryButton onClick={() => dispatch({ type: 'BACK' })}>Voltar</SecondaryButton>
        <PrimaryButton disabled={!podeRevisar} onClick={() => dispatch({ type: 'GO_REVIEW' })}>
          Continuar
        </PrimaryButton>
      </div>
    </div>
  )

  function renderProfissionais() {
    if (profissionaisStatus === 'loading' || profissionaisStatus === 'idle') {
      return (
        <div className="flex flex-col gap-3">
          <SkeletonBlock height="4.5rem" label="Carregando profissionais" />
          <SkeletonBlock height="4.5rem" label="Carregando profissionais" />
          <SkeletonBlock height="4.5rem" label="Carregando profissionais" />
        </div>
      )
    }

    if (profissionaisStatus === 'error') {
      return (
        <InlineBanner
          tone="error"
          action={{ label: 'Tentar novamente', onClick: () => setProfissionaisRetry((value) => value + 1) }}
        >
          {ERRO_PROFISSIONAIS}
        </InlineBanner>
      )
    }

    if (profissionais.length === 0) {
      return <InlineBanner tone="info">{VAZIO_PROFISSIONAIS}</InlineBanner>
    }

    return (
      <div className="flex flex-col gap-3">
        {profissionais.map((profissional) => (
          <SelectionCard
            key={profissional.id}
            title={profissional.nome}
            description={`CREF ${profissional.cref}`}
            selected={profissionalSelecionado?.id === profissional.id}
            onSelect={() => dispatch({ type: 'SELECT_PROFESSIONAL', payload: profissional })}
          />
        ))}
      </div>
    )
  }

  function renderDias() {
    if (!profissionalSelecionado) {
      return <p className="text-sm text-[var(--text-muted)]">Escolha um profissional para ver as datas.</p>
    }

    if (diasStatus === 'loading') {
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 7 }, (_, index) => (
            <SkeletonBlock key={index} height="4rem" label="Carregando datas disponíveis" />
          ))}
        </div>
      )
    }

    if (diasStatus === 'error') {
      return (
        <InlineBanner
          tone="error"
          action={{ label: 'Tentar novamente', onClick: () => setDiasRetry((value) => value + 1) }}
        >
          {ERRO_DIAS}
        </InlineBanner>
      )
    }

    if (dias.length === 0) {
      return <InlineBanner tone="info">{VAZIO_DIAS}</InlineBanner>
    }

    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {dias.map((dia) => (
          <SelectionCard
            key={dia.data}
            title={dia.label}
            description={dia.data}
            selected={diaSelecionado?.data === dia.data}
            onSelect={() => dispatch({ type: 'SELECT_DAY', payload: dia })}
          />
        ))}
      </div>
    )
  }

  function renderHorarios() {
    if (!profissionalSelecionado || !diaSelecionado) {
      return <p className="text-sm text-[var(--text-muted)]">Escolha uma data para ver os horários.</p>
    }

    if (horariosStatus === 'loading') {
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 8 }, (_, index) => (
            <SkeletonBlock key={index} height="2.75rem" label="Carregando horários" />
          ))}
        </div>
      )
    }

    if (horariosStatus === 'error') {
      return (
        <InlineBanner
          tone="error"
          action={{ label: 'Tentar novamente', onClick: () => setHorariosRetry((value) => value + 1) }}
        >
          {ERRO_HORARIOS}
        </InlineBanner>
      )
    }

    if (horarios.length === 0) {
      return <InlineBanner tone="info">{VAZIO_HORARIOS}</InlineBanner>
    }

    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {horarios.map((horario) => (
          <TimeChip
            key={horario.horario}
            time={horario.horario}
            selected={horarioSelecionado?.horario === horario.horario}
            onSelect={() => dispatch({ type: 'SELECT_TIME', payload: horario })}
          />
        ))}
      </div>
    )
  }
}

function statusDoRecurso<T>(resource: ResourceState<T>, key: string | null): LoadState {
  if (!key) return 'idle'
  if (resource.key !== key) return 'loading'
  return resource.status
}
