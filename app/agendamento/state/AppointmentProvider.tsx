'use client'

import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useMemo,
  useReducer,
} from 'react'

import {
  appointmentReducer,
  type AppointmentAction,
  type AppointmentState,
  initialAppointmentState,
} from './appointmentReducer'

interface AppointmentContextValue {
  state: AppointmentState
  dispatch: Dispatch<AppointmentAction>
}

const AppointmentContext = createContext<AppointmentContextValue | null>(null)

export interface AppointmentProviderProps {
  children: ReactNode
}

export function AppointmentProvider({ children }: AppointmentProviderProps) {
  const [state, dispatch] = useReducer(appointmentReducer, initialAppointmentState)
  const value = useMemo(() => ({ state, dispatch }), [state])

  return <AppointmentContext.Provider value={value}>{children}</AppointmentContext.Provider>
}

export function useAppointmentFlow() {
  const context = useContext(AppointmentContext)
  if (!context) {
    throw new Error('useAppointmentFlow deve ser usado dentro de AppointmentProvider.')
  }
  return context
}
