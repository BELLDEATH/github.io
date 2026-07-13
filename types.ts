export type UserRole = 'user' | 'admin' | 'super_admin'
export type IdentityType = 'department_leader' | 'section_chief' | 'deputy_section_chief' | 'staff'
export type SurveyStatus = 'draft' | 'active' | 'closed'

export const IDENTITY_LABELS: Record<IdentityType, string> = {
  department_leader: '部领导',
  section_chief: '科长',
  deputy_section_chief: '副科长',
  staff: '科员',
}

export const IDENTITY_ORDER: IdentityType[] = [
  'department_leader',
  'section_chief',
  'deputy_section_chief',
  'staff',
]

export const SCORES = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

export interface Profile {
  id: string
  nickname: string | null
  openid: string | null
  role: UserRole
  created_at: string
}

export interface Department {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface SurveyCycle {
  id: string
  name: string
  status: SurveyStatus
  created_at: string
  updated_at: string
}

export interface Dimension {
  id: string
  name: string
  sort_order: number
  leader_only: boolean
  created_at: string
}

export interface Evaluatee {
  id: string
  name: string
  department: string | null
  identity: IdentityType
  cycle_id: string | null
  created_at: string
}

export interface Submission {
  id: string
  cycle_id: string
  user_id: string
  nickname: string | null
  identity: IdentityType
  department: string | null
  created_at: string
}

export interface Rating {
  id: string
  cycle_id: string
  evaluator_id: string
  evaluatee_id: string
  dimension_id: string
  score: number
  created_at: string
}

export interface AdminSetting {
  id: string
  key: string
  value: string
  updated_at: string
}
