import { describe, expect, it } from 'vitest'
import type {
  ConfiguracaoSucesso,
  CriarSolicitacaoAgendamentoDTO,
  DiaDisponivel,
  HorarioDisponivel,
  Profissional,
  SolicitacaoAgendamento,
  SolicitacaoAgendamentoDTO,
} from '../types'

// INVARIANT: contratos públicos da feature de agendamento não devem representar
// dados de terceiros (nome, telefone, quantidade ou identificador de outras
// Solicitações de Agendamento concorrentes).
// OWNING_LAYER: unit | REAL_EXECUTION_BOUNDARY: none
// Setup: fixtures locais tipadas — nenhum mock, nenhuma I/O.

const FORBIDDEN_THIRD_PARTY_KEYS = [
  'nomeTerceiro',
  'nomeConcorrente',
  'telefone',
  'telefoneCliente',
  'telefoneTerceiro',
  'telefoneNormalizado',
  'telefoneExibicao',
  'quantidade',
  'quantidadeConcorrentes',
  'quantidadeSolicitantes',
  'quantidadeSolicitacoesPendentes',
  'concorrentes',
  'solicitantes',
  'idConcorrente',
  'idsConcorrentes',
  'clientesAguardando',
  'nomeCliente',
]

describe('types.ts — contrato público de agendamento', () => {
  it('public_dtos_exclude_third_party_private_fields', () => {
    const profissional: Profissional = { id: 'profissional', nome: 'Dra. Ana' }
    const diaDisponivel: DiaDisponivel = { data: '2026-08-20', label: 'Qui, 20/08' }
    const horarioDisponivel: HorarioDisponivel = { horario: '09:00' }
    const solicitacaoAgendamento: SolicitacaoAgendamento = {
      id: 'sol-1',
      status: 'AGUARDANDO_CONFIRMACAO',
      profissionalNome: 'Dra. Ana',
      data: '2026-08-20',
      horario: '09:00',
    }
    const configuracaoSucesso: ConfiguracaoSucesso = {
      titulo: 'Solicitação enviada',
      descricao: 'Aguarde a confirmação administrativa.',
      regras: ['Chegue com 10 minutos de antecedência.'],
      dicas: ['Leve documento com foto.'],
      avisos: ['O horário só é definitivo após confirmação.'],
    }
    const solicitacaoAgendamentoDTO: SolicitacaoAgendamentoDTO = {
      id: 'sol-1',
      status: 'AGUARDANDO_CONFIRMACAO',
      profissionalNome: 'Dra. Ana',
      data: '2026-08-20',
      horario: '09:00',
    }

    // Contrato literal: as chaves expostas são exatamente estas — nenhuma a mais.
    expect(Object.keys(profissional).sort()).toEqual(['id', 'nome'])
    expect(Object.keys(diaDisponivel).sort()).toEqual(['data', 'label'])
    expect(Object.keys(horarioDisponivel).sort()).toEqual(['horario'])
    expect(Object.keys(solicitacaoAgendamento).sort()).toEqual([
      'data',
      'horario',
      'id',
      'profissionalNome',
      'status',
    ])
    expect(Object.keys(configuracaoSucesso).sort()).toEqual([
      'avisos',
      'descricao',
      'dicas',
      'regras',
      'titulo',
    ])
    expect(Object.keys(solicitacaoAgendamentoDTO).sort()).toEqual([
      'data',
      'horario',
      'id',
      'profissionalNome',
      'status',
    ])

    const publicDtos: object[] = [
      profissional,
      diaDisponivel,
      horarioDisponivel,
      solicitacaoAgendamento,
      configuracaoSucesso,
      solicitacaoAgendamentoDTO,
    ]

    for (const dto of publicDtos) {
      const keys = Object.keys(dto)
      for (const forbidden of FORBIDDEN_THIRD_PARTY_KEYS) {
        expect(keys).not.toContain(forbidden)
      }
    }
  })

  it('creation_dto_carries_only_the_requesting_client_own_identification_and_no_concurrency_data', () => {
    // Negative companion (CA-15): o único DTO público que legitimamente carrega
    // nome/telefone é o de criação, e são do próprio solicitante — nunca de
    // terceiros — e mesmo esse DTO não pode carregar quantidade ou identificador
    // de Solicitações de Agendamento concorrentes.
    const criarSolicitacaoAgendamentoDTO: CriarSolicitacaoAgendamentoDTO = {
      nomeCliente: 'Maria Souza',
      telefoneNormalizado: '5511999998888',
      telefoneExibicao: '(11) 99999-8888',
      profissionalId: 'prof-1',
      data: '2026-08-20',
      horario: '09:00',
    }

    expect(Object.keys(criarSolicitacaoAgendamentoDTO).sort()).toEqual([
      'data',
      'horario',
      'nomeCliente',
      'profissionalId',
      'telefoneExibicao',
      'telefoneNormalizado',
    ])
    expect(criarSolicitacaoAgendamentoDTO).not.toHaveProperty('quantidadeConcorrentes')
    expect(criarSolicitacaoAgendamentoDTO).not.toHaveProperty('idsConcorrentes')
  })
})
