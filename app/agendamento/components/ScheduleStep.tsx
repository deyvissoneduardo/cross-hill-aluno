'use client'

import { useEffect, useMemo, useState } from 'react'

import { InlineBanner } from '@/components/ui/InlineBanner'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
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
const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

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
  const [mesVisivel, setMesVisivel] = useState(() => inicioDoMes(new Date()))

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
  const dias = useMemo(
    () => (diasStatus === 'success' ? diasResource.dados : []),
    [diasResource.dados, diasStatus]
  )
  const horarios = horariosStatus === 'success' ? horariosResource.dados : []
  const diasDisponiveis = useMemo(() => new Map(dias.map((dia) => [dia.data, dia])), [dias])
  const diasDoCalendario = useMemo(() => montarMes(mesVisivel), [mesVisivel])

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
    if (profissionaisStatus !== 'success' || profissionaisResource.dados.length !== 1) return

    const profissional = profissionaisResource.dados[0]
    if (profissionalSelecionado?.id !== profissional.id) {
      dispatch({ type: 'SELECT_PROFESSIONAL', payload: profissional })
    }
  }, [dispatch, profissionalSelecionado?.id, profissionaisResource, profissionaisStatus])

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

  function renderEstadoProfissional() {
    if (profissionaisStatus === 'loading' || profissionaisStatus === 'idle') {
      return (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }, (_, index) => (
            <SkeletonBlock key={index} height="3rem" label="Carregando calendário" />
          ))}
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

    return null
  }

  function renderDias() {
    const estadoProfissional = renderEstadoProfissional()
    if (estadoProfissional) {
      if (profissionaisStatus === 'loading' || profissionaisStatus === 'idle') {
        return estadoProfissional
      }
      return (
        <div className="flex flex-col gap-3">
          {renderCalendarioIndisponivel()}
          {estadoProfissional}
        </div>
      )
    }

    if (!profissionalSelecionado) {
      return null
    }

    if (diasStatus === 'loading') {
      return (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }, (_, index) => (
            <SkeletonBlock key={index} height="3rem" label="Carregando calendário" />
          ))}
        </div>
      )
    }

    if (diasStatus === 'error') {
      return (
        <div className="flex flex-col gap-3">
          {renderCalendarioIndisponivel()}
          <InlineBanner
            tone="error"
            action={{ label: 'Tentar novamente', onClick: () => setDiasRetry((value) => value + 1) }}
          >
            {ERRO_DIAS}
          </InlineBanner>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-3" aria-label="Calendário de disponibilidade">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-black/5"
            aria-label="Mês anterior"
            onClick={() => setMesVisivel((mes) => alterarMes(mes, -1))}
          >
            ←
          </button>
          <p className="font-semibold capitalize text-[var(--foreground)]">
            {formatarMes(mesVisivel)}
          </p>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-black/5"
            aria-label="Próximo mês"
            onClick={() => setMesVisivel((mes) => alterarMes(mes, 1))}
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center">
          {DIAS_DA_SEMANA.map((dia) => (
            <span key={dia} className="py-1 text-xs font-medium text-[var(--text-muted)]">
              {dia}
            </span>
          ))}
          {diasDoCalendario.map((celula, index) => {
            if (!celula) return <span key={`vazio-${index}`} aria-hidden="true" />

            const diaDisponivel = diasDisponiveis.get(celula.data)
            const selecionado = diaSelecionado?.data === celula.data
            return (
              <button
                key={celula.data}
                type="button"
                disabled={!diaDisponivel}
                aria-label={diaDisponivel?.label ?? `${celula.label} indisponível`}
                aria-pressed={diaDisponivel ? selecionado : undefined}
                onClick={() => diaDisponivel && dispatch({ type: 'SELECT_DAY', payload: diaDisponivel })}
                className={`min-h-12 rounded-xl border text-sm font-semibold transition-colors ${
                  diaDisponivel
                    ? selecionado
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-[var(--accent)] bg-[var(--surface-muted)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white'
                    : 'cursor-not-allowed border-transparent bg-black/5 text-[var(--text-muted)] opacity-55'
                }`}
              >
                {celula.dia}
              </button>
            )
          })}
        </div>

        {dias.length === 0 ? <InlineBanner tone="info">{VAZIO_DIAS}</InlineBanner> : null}
      </div>
    )
  }

  function renderCalendarioIndisponivel() {
    return (
      <div className="flex flex-col gap-3" aria-label="Calendário de disponibilidade">
        <div className="flex items-center justify-between gap-3">
          <button type="button" aria-label="Mês anterior" onClick={() => setMesVisivel((mes) => alterarMes(mes, -1))}>
            ←
          </button>
          <p className="font-semibold capitalize text-[var(--foreground)]">{formatarMes(mesVisivel)}</p>
          <button type="button" aria-label="Próximo mês" onClick={() => setMesVisivel((mes) => alterarMes(mes, 1))}>
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center">
          {DIAS_DA_SEMANA.map((dia) => (
            <span key={dia} className="py-1 text-xs font-medium text-[var(--text-muted)]">{dia}</span>
          ))}
          {diasDoCalendario.map((celula, index) =>
            celula ? (
              <button
                key={celula.data}
                type="button"
                disabled
                aria-label={`${celula.label} indisponível`}
                className="min-h-12 cursor-not-allowed rounded-xl border border-transparent bg-black/5 text-sm font-semibold text-[var(--text-muted)] opacity-55"
              >
                {celula.dia}
              </button>
            ) : (
              <span key={`vazio-${index}`} aria-hidden="true" />
            )
          )}
        </div>
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

function inicioDoMes(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), 1)
}

function alterarMes(data: Date, quantidade: number): Date {
  return new Date(data.getFullYear(), data.getMonth() + quantidade, 1)
}

function formatarMes(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(data)
}

function montarMes(data: Date): Array<{ data: string; dia: number; label: string } | null> {
  const ano = data.getFullYear()
  const mes = data.getMonth()
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const celulas: Array<{ data: string; dia: number; label: string } | null> = Array.from(
    { length: new Date(ano, mes, 1).getDay() },
    () => null
  )

  for (let dia = 1; dia <= totalDias; dia += 1) {
    const referencia = new Date(ano, mes, dia)
    const dataIso = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    celulas.push({
      data: dataIso,
      dia,
      label: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(referencia),
    })
  }

  return celulas
}

function statusDoRecurso<T>(resource: ResourceState<T>, key: string | null): LoadState {
  if (!key) return 'idle'
  if (resource.key !== key) return 'loading'
  return resource.status
}
