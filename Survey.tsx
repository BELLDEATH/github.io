import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getActiveCycle, getEvaluatees, getDimensions, getMySubmission, createSubmission, createRatings } from '@/api/api'
import type { Evaluatee, Dimension, IdentityType } from '@/types/types'
import { IDENTITY_LABELS, IDENTITY_ORDER, SCORES } from '@/types/types'

type ScoreMap = Record<string, Record<string, number>> // evaluateeId -> dimensionId -> score

export default function Survey() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const identity = (sessionStorage.getItem('survey_identity') || 'staff') as IdentityType
  const deptId = sessionStorage.getItem('survey_dept_id') || ''
  const deptName = sessionStorage.getItem('survey_dept_name') || ''

  const [cycle, setCycle] = useState<{ id: string; name: string } | null>(null)
  const [evaluatees, setEvaluatees] = useState<Evaluatee[]>([])
  const [dimensions, setDimensions] = useState<Dimension[]>([])
  const [scores, setScores] = useState<ScoreMap>({})
  const [activeGroup, setActiveGroup] = useState<IdentityType>('department_leader')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [groups, setGroups] = useState<IdentityType[]>([])
  const tabsRef = useRef<HTMLDivElement>(null)

  const visibleDims = identity === 'staff' ? dimensions.filter((d) => !d.leader_only) : dimensions

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const activeCycle = await getActiveCycle()
      if (!activeCycle) { navigate('/'); return }
      const sub = await getMySubmission(activeCycle.id, user.id)
      if (sub) { navigate('/result'); return }
      const [evs, dims] = await Promise.all([getEvaluatees(activeCycle.id), getDimensions()])
      setCycle(activeCycle)
      setDimensions(dims)
      const filteredEvs = evs.filter((e) => e.id !== user.id)
      setEvaluatees(filteredEvs)
      // 确定有被评价人的分组
      const available = IDENTITY_ORDER.filter((g) => filteredEvs.some((e) => e.identity === g))
      setGroups(available)
      if (available.length > 0) setActiveGroup(available[0])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user, navigate])

  useEffect(() => { loadData() }, [loadData])

  const setScore = (evId: string, dimId: string, score: number) => {
    setScores((prev) => ({ ...prev, [evId]: { ...(prev[evId] || {}), [dimId]: score } }))
  }

  const groupEvaluatees = evaluatees.filter((e) => e.identity === activeGroup)
  const groupDims = activeGroup === 'staff' ? dimensions.filter((d) => !d.leader_only) : dimensions

  const isEvComplete = (evId: string) => {
    const evScores = scores[evId] || {}
    return groupDims.every((d) => evScores[d.id] !== undefined)
  }

  const completedInGroup = groupEvaluatees.filter((e) => isEvComplete(e.id)).length
  const groupProgress = groupEvaluatees.length > 0 ? Math.round((completedInGroup / groupEvaluatees.length) * 100) : 0

  const allComplete = evaluatees.every((ev) => {
    const evDims = ev.identity === 'staff' ? dimensions.filter((d) => !d.leader_only) : dimensions
    const evScores = scores[ev.id] || {}
    return evDims.every((d) => evScores[d.id] !== undefined)
  })

  const handleSubmit = async () => {
    if (!allComplete) { alert('请完成所有被评价人的打分'); return }
    if (!cycle || !user) return
    setSubmitting(true)
    try {
      await createSubmission({
        cycle_id: cycle.id,
        user_id: user.id,
        nickname: profile?.nickname || null,
        identity,
        department: deptId || null,
      })
      const ratingsPayload: { cycle_id: string; evaluator_id: string; evaluatee_id: string; dimension_id: string; score: number }[] = []
      for (const ev of evaluatees) {
        const evDims = ev.identity === 'staff' ? dimensions.filter((d) => !d.leader_only) : dimensions
        for (const dim of evDims) {
          const score = scores[ev.id]?.[dim.id]
          if (score !== undefined) {
            ratingsPayload.push({ cycle_id: cycle.id, evaluator_id: user.id, evaluatee_id: ev.id, dimension_id: dim.id, score })
          }
        }
      }
      await createRatings(ratingsPayload)
      navigate('/result')
    } catch (e: unknown) {
      alert((e as Error).message || '提交失败')
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="app-container min-h-screen flex items-center justify-center">
      <p className="text-secondary text-sm">加载中…</p>
    </div>
  )

  return (
    <div className="app-container min-h-screen flex flex-col bg-background">
      <div className="brand-bar" />

      {/* 顶部 */}
      <div className="bg-primary px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-white/70">{cycle?.name}</p>
          <h1 className="text-base font-semibold text-white mt-0.5">
            {IDENTITY_LABELS[identity]} · {deptName}
          </h1>
        </div>
        <button type="button" onClick={() => navigate('/')} className="text-xs text-white/60">返回</button>
      </div>

      {/* 全局进度 */}
      <div className="bg-white border-b border-border px-5 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-secondary">总进度</span>
          <span className="text-xs font-semibold text-primary">
            {evaluatees.filter((e) => isEvComplete(e.id)).length} / {evaluatees.length} 人
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full progress-fill"
            style={{ width: `${evaluatees.length > 0 ? Math.round((evaluatees.filter((e) => isEvComplete(e.id)).length / evaluatees.length) * 100) : 0}%` }} />
        </div>
      </div>

      {/* 分组 Tab */}
      <div ref={tabsRef} className="bg-white border-b border-border px-4 flex overflow-x-auto">
        {groups.map((g) => {
          const gEvs = evaluatees.filter((e) => e.identity === g)
          const gDims = g === 'staff' ? dimensions.filter((d) => !d.leader_only) : dimensions
          const done = gEvs.filter((e) => gDims.every((d) => (scores[e.id] || {})[d.id] !== undefined)).length
          const allDone = done === gEvs.length && gEvs.length > 0
          return (
            <button
              key={g}
              type="button"
              onClick={() => setActiveGroup(g)}
              className={`flex-shrink-0 py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeGroup === g ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
            >
              {IDENTITY_LABELS[g]}
              <span className={`badge ${allDone ? 'bg-green-100 text-green-700' : 'bg-muted text-secondary'}`}>
                {done}/{gEvs.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* 当前组进度 */}
      <div className="px-5 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
        <span className="text-xs text-secondary">{IDENTITY_LABELS[activeGroup]} · {groupEvaluatees.length}人</span>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full progress-fill" style={{ width: `${groupProgress}%` }} />
          </div>
          <span className="text-xs text-accent font-semibold">{groupProgress}%</span>
        </div>
      </div>

      {/* 打分区 */}
      <div className="flex-1 overflow-y-auto pb-24">
        {groupEvaluatees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">该组暂无被评价人</p>
          </div>
        ) : (
          groupEvaluatees.map((ev) => {
            const evDims = ev.identity === 'staff' ? dimensions.filter((d) => !d.leader_only) : dimensions
            const done = isEvComplete(ev.id)
            return (
              <div key={ev.id} className="border-b border-border">
                {/* 被评价人标题 */}
                <div className={`px-5 py-3 flex items-center justify-between ${done ? 'bg-green-50' : 'bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{ev.name[0]}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{ev.name}</span>
                    <span className="text-xs text-muted-foreground">{IDENTITY_LABELS[ev.identity]}</span>
                  </div>
                  {done && (
                    <span className="badge bg-green-100 text-green-700 text-xs">✓ 已完成</span>
                  )}
                </div>

                {/* 维度打分 */}
                <div className="bg-white">
                  {evDims.map((dim, idx) => {
                    const score = scores[ev.id]?.[dim.id]
                    return (
                      <div key={dim.id} className={`px-5 py-3 ${idx < evDims.length - 1 ? 'border-b border-border/60' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-secondary font-medium">{dim.name}</span>
                          {score !== undefined && (
                            <span className="text-xs font-bold text-accent">{score}分</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {SCORES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setScore(ev.id, dim.id, s)}
                              className={`w-8 h-8 rounded text-xs font-semibold border transition-colors ${score === s ? 'bg-primary text-white border-primary' : 'bg-background text-foreground border-border hover:border-primary/50'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 底部提交栏 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-white border-t border-border px-5 py-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !allComplete}
          className={`w-full py-4 rounded text-sm font-semibold transition-colors ${allComplete ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
        >
          {submitting ? '提交中…' : allComplete ? '提交全部评价' : `还有 ${evaluatees.filter((e) => {
            const evDims = e.identity === 'staff' ? dimensions.filter((d) => !d.leader_only) : dimensions
            return !evDims.every((d) => (scores[e.id] || {})[d.id] !== undefined)
          }).length} 人未完成`}
        </button>
      </div>
    </div>
  )
}
