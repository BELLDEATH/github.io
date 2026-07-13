import { supabase } from '@/lib/supabase'
import type {
  Department, Dimension, Evaluatee, Profile, Rating,
  Submission, SurveyCycle, SurveyStatus, IdentityType, UserRole,
} from '@/types/types'

// ===== 科室 =====
export async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabase.from('departments').select('*').order('sort_order').limit(100)
  if (error) throw error
  return Array.isArray(data) ? data : []
}
export async function addDepartment(name: string) {
  const { error } = await supabase.from('departments').insert({ name })
  if (error) throw error
}
export async function deleteDepartment(id: string) {
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) throw error
}

// ===== 问卷周期 =====
export async function getSurveyCycles(): Promise<SurveyCycle[]> {
  const { data, error } = await supabase.from('survey_cycles').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return Array.isArray(data) ? data : []
}
export async function getActiveCycle(): Promise<SurveyCycle | null> {
  const { data, error } = await supabase.from('survey_cycles').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data
}
export async function createSurveyCycle(name: string) {
  const { error } = await supabase.from('survey_cycles').insert({ name })
  if (error) throw error
}
export async function updateSurveyCycleStatus(id: string, status: SurveyStatus) {
  const { error } = await supabase.from('survey_cycles').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
export async function updateSurveyCycleName(id: string, name: string) {
  const { error } = await supabase.from('survey_cycles').update({ name, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
export async function deleteSurveyCycle(id: string) {
  const { error } = await supabase.from('survey_cycles').delete().eq('id', id)
  if (error) throw error
}

// ===== 评价维度 =====
export async function getDimensions(): Promise<Dimension[]> {
  const { data, error } = await supabase.from('dimensions').select('*').order('sort_order').limit(100)
  if (error) throw error
  return Array.isArray(data) ? data : []
}
export async function addDimension(name: string, leaderOnly = false) {
  const { data: maxData } = await supabase.from('dimensions').select('sort_order').order('sort_order', { ascending: false }).limit(1)
  const nextOrder = maxData && maxData.length > 0 ? maxData[0].sort_order + 1 : 0
  const { error } = await supabase.from('dimensions').insert({ name, sort_order: nextOrder, leader_only: leaderOnly })
  if (error) throw error
}
export async function deleteDimension(id: string) {
  const { error } = await supabase.from('dimensions').delete().eq('id', id)
  if (error) throw error
}

// ===== 被评价人 =====
export async function getEvaluatees(cycleId: string): Promise<Evaluatee[]> {
  const { data, error } = await supabase.from('evaluatees').select('*').eq('cycle_id', cycleId).order('created_at').limit(500)
  if (error) throw error
  return Array.isArray(data) ? data : []
}
export async function addEvaluatee(ev: { name: string; department: string | null; identity: IdentityType; cycle_id: string }) {
  const { error } = await supabase.from('evaluatees').insert(ev)
  if (error) throw error
}
export async function deleteEvaluatee(id: string) {
  const { error } = await supabase.from('evaluatees').delete().eq('id', id)
  if (error) throw error
}

// ===== 提交记录 =====
export async function getMySubmission(cycleId: string, userId: string): Promise<Submission | null> {
  const { data, error } = await supabase.from('submissions').select('*').eq('cycle_id', cycleId).eq('user_id', userId).limit(1).maybeSingle()
  if (error) throw error
  return data
}
export async function createSubmission(sub: { cycle_id: string; user_id: string; nickname: string | null; identity: IdentityType; department: string | null }) {
  const { error } = await supabase.from('submissions').insert(sub)
  if (error) throw error
}
export async function getAllSubmissions(cycleId: string): Promise<Submission[]> {
  const { data, error } = await supabase.from('submissions').select('*').eq('cycle_id', cycleId).order('created_at', { ascending: false }).limit(500)
  if (error) throw error
  return Array.isArray(data) ? data : []
}
export async function deleteSubmission(id: string) {
  const { error } = await supabase.from('submissions').delete().eq('id', id)
  if (error) throw error
}
export async function deleteSubmissionWithRatings(submissionId: string, userId: string, cycleId: string) {
  const { error: rErr } = await supabase.from('ratings').delete().eq('evaluator_id', userId).eq('cycle_id', cycleId)
  if (rErr) throw rErr
  const { error: sErr } = await supabase.from('submissions').delete().eq('id', submissionId)
  if (sErr) throw sErr
}

// ===== 评分 =====
export async function getMyRatings(cycleId: string, userId: string): Promise<Rating[]> {
  const { data, error } = await supabase.from('ratings').select('*').eq('cycle_id', cycleId).eq('evaluator_id', userId).order('created_at').limit(2000)
  if (error) throw error
  return Array.isArray(data) ? data : []
}
export async function createRatings(ratings: Omit<Rating, 'id' | 'created_at'>[]) {
  const { error } = await supabase.from('ratings').insert(ratings)
  if (error) throw error
}
export async function getAllRatings(cycleId: string): Promise<Rating[]> {
  const { data, error } = await supabase.from('ratings').select('*').eq('cycle_id', cycleId).order('created_at', { ascending: false }).limit(5000)
  if (error) throw error
  return Array.isArray(data) ? data : []
}

// ===== 用户管理 =====
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200)
  if (error) throw error
  return Array.isArray(data) ? data : []
}
export async function updateUserRole(userId: string, role: UserRole) {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) throw error
}

// ===== 管理员设置 =====
export async function getAdminSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase.from('admin_settings').select('value').eq('key', key).limit(1).maybeSingle()
  if (error) throw error
  return data?.value ?? null
}
export async function updateAdminSetting(key: string, value: string) {
  const { error } = await supabase.from('admin_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key)
  if (error) throw error
}

// ===== 统计 =====
export async function getSurveyStats(cycleId: string) {
  const [submissions, ratings, evaluatees, dimensions] = await Promise.all([
    getAllSubmissions(cycleId),
    getAllRatings(cycleId),
    getEvaluatees(cycleId),
    getDimensions(),
  ])
  const totalEvaluatees = evaluatees.length
  const totalSubmissions = submissions.length
  const completionRate = totalEvaluatees > 0 ? Math.round((totalSubmissions / totalEvaluatees) * 100) : 0

  const dimensionStats = dimensions.map((dim) => {
    const dimRatings = ratings.filter((r) => r.dimension_id === dim.id)
    const avg = dimRatings.length > 0 ? Math.round((dimRatings.reduce((s, r) => s + r.score, 0) / dimRatings.length) * 10) / 10 : 0
    return { dimension: dim.name, avg, count: dimRatings.length }
  })

  const identityMap: Record<string, { count: number; total: number }> = {}
  for (const sub of submissions) {
    const id = sub.identity
    if (!identityMap[id]) identityMap[id] = { count: 0, total: 0 }
    identityMap[id].count += 1
  }
  for (const r of ratings) {
    const sub = submissions.find((s) => s.user_id === r.evaluator_id)
    const id = sub?.identity || 'staff'
    if (identityMap[id]) identityMap[id].total += r.score
  }
  const identityStats = Object.entries(identityMap).map(([id, d]) => ({
    identity: id,
    count: d.count,
    avg: d.count > 0 ? Math.round((d.total / d.count) * 10) / 10 : 0,
  }))

  return { totalEvaluatees, totalSubmissions, completionRate, dimensionStats, identityStats }
}

// ===== CSV 导出 =====
export async function exportRatingsCSV(cycleId: string): Promise<string> {
  const [submissions, ratings, evaluatees, dimensions] = await Promise.all([
    getAllSubmissions(cycleId),
    getAllRatings(cycleId),
    getEvaluatees(cycleId),
    getDimensions(),
  ])

  const header = ['评价者昵称', '被评价人', '被评价人职级', '提交时间', ...dimensions.map((d) => d.name), '总分', '平均分']
  const rows: string[][] = []

  for (const sub of submissions) {
    const subRatings = ratings.filter((r) => r.evaluator_id === sub.user_id)
    const evaluateeGroups: Record<string, Rating[]> = {}
    for (const r of subRatings) {
      if (!evaluateeGroups[r.evaluatee_id]) evaluateeGroups[r.evaluatee_id] = []
      evaluateeGroups[r.evaluatee_id].push(r)
    }
    for (const [evId, evRatings] of Object.entries(evaluateeGroups)) {
      const ev = evaluatees.find((e) => e.id === evId)
      if (!ev) continue
      const scores = dimensions.map((dim) => evRatings.find((r) => r.dimension_id === dim.id)?.score ?? '')
      const total = scores.reduce((s: number, v) => s + (typeof v === 'number' ? v : 0), 0)
      const count = scores.filter((v) => typeof v === 'number' && v > 0).length
      const avg = count > 0 ? Math.round((total / count) * 10) / 10 : 0
      rows.push([
        sub.nickname || '匿名',
        ev.name,
        ev.identity,
        new Date(sub.created_at).toLocaleString('zh-CN'),
        ...scores.map(String),
        String(total),
        String(avg),
      ])
    }
  }

  const csvContent = [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
  return '\uFEFF' + csvContent // BOM for Excel
}
