import type { DiaDisponivel, HorarioDisponivel, Profissional, SolicitacaoAgendamento } from '../types'

export type AppointmentStep = 'identification' | 'schedule' | 'review' | 'success'

export interface AppointmentIdentification {
  nomeCliente: string
  telefoneNormalizado: string
}

export interface AppointmentSelection {
  profissional: Profissional | null
  dia: DiaDisponivel | null
  horario: HorarioDisponivel | null
}

export interface AppointmentState {
  step: AppointmentStep
  identification: AppointmentIdentification | null
  selection: AppointmentSelection
  flowError: string | null
  submitError: string | null
  isSubmitting: boolean
  solicitacao: SolicitacaoAgendamento | null
}

export type AppointmentAction =
  | { type: 'SET_IDENTIFICATION'; payload: AppointmentIdentification }
  | { type: 'SELECT_PROFESSIONAL'; payload: Profissional }
  | { type: 'SELECT_DAY'; payload: DiaDisponivel }
  | { type: 'SELECT_TIME'; payload: HorarioDisponivel }
  | { type: 'GO_REVIEW' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; payload: SolicitacaoAgendamento }
  | { type: 'SUBMIT_FAILURE'; payload: string }
  | { type: 'BACK' }

export const initialAppointmentState: AppointmentState = {
  step: 'identification',
  identification: null,
  selection: {
    profissional: null,
    dia: null,
    horario: null,
  },
  flowError: null,
  submitError: null,
  isSubmitting: false,
  solicitacao: null,
}

function hasCompleteSelection(state: AppointmentState): boolean {
  return Boolean(
    state.identification &&
      state.selection.profissional &&
      state.selection.dia &&
      state.selection.horario,
  )
}

export function appointmentReducer(
  state: AppointmentState,
  action: AppointmentAction,
): AppointmentState {
  switch (action.type) {
    case 'SET_IDENTIFICATION':
      return {
        ...state,
        step: 'schedule',
        identification: action.payload,
        selection: {
          profissional: null,
          dia: null,
          horario: null,
        },
        flowError: null,
        submitError: null,
        isSubmitting: false,
        solicitacao: null,
      }

    case 'SELECT_PROFESSIONAL':
      return {
        ...state,
        selection: {
          profissional: action.payload,
          dia: null,
          horario: null,
        },
        flowError: null,
        submitError: null,
      }

    case 'SELECT_DAY':
      return {
        ...state,
        selection: {
          ...state.selection,
          dia: action.payload,
          horario: null,
        },
        flowError: null,
        submitError: null,
      }

    case 'SELECT_TIME':
      return {
        ...state,
        selection: {
          ...state.selection,
          horario: action.payload,
        },
        flowError: null,
        submitError: null,
      }

    case 'GO_REVIEW':
      if (!hasCompleteSelection(state)) {
        return {
          ...state,
          flowError: 'Escolha profissional, dia e horário antes de revisar.',
          submitError: null,
        }
      }

      return {
        ...state,
        step: 'review',
        flowError: null,
        submitError: null,
      }

    case 'SUBMIT_START':
      return {
        ...state,
        isSubmitting: true,
        submitError: null,
        flowError: null,
      }

    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        step: 'success',
        isSubmitting: false,
        submitError: null,
        flowError: null,
        solicitacao: action.payload,
      }

    case 'SUBMIT_FAILURE':
      return {
        ...state,
        isSubmitting: false,
        submitError: action.payload,
      }

    case 'BACK':
      if (state.step === 'schedule') {
        return { ...state, step: 'identification', flowError: null, submitError: null }
      }
      if (state.step === 'review') {
        return { ...state, step: 'schedule', flowError: null, submitError: null }
      }
      return state
  }
}
