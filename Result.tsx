import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getActiveCycle, getMySubmission, getMyRatings, getEvaluatees, getDimensions } from '@/api/api'
import type { Submission, Rating, Evaluatee, Dimension, SurveyCycle } from '@/types/types'
import { IDENTITY_LABELS } from '@/types/types'

export default function Result() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [cycle, setCycle] = useState<SurveyCycle | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [ratings, setRatings] = useState<Rating[]>([])
  const [evaluatees, setEvaluatees] = useState<Evaluatee[]>([])
  const [dimensions, setDimensions] = useState<Dimension[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const activeCycle = await getActiveCycle()
      setCycle(activeCycle)
      if (activeCycle) {
        const [sub, myRatings, evs, dims] = await Promise.all([
          getMySubmission(activeCycle.id, user.id),
          getMyRatings(activeCycle.id, user.id),
          getEvaluatees(activeCycle.id),
          getDimensions(),
        ])
        setSubmission(sub)
        setRatings(myRatings)
        setEvaluatees(evs)
        setDimensions(dims)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return (
    <div className="app-container min-h-screen flex items-center justify-center">
      <p className="text-secondary text-sm">加载中…</p>
    </div>
  )

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  return (
    <div className="app-container min-h-screen bg-muted flex flex-col">
      <div className="brand-bar" />

      <div className="bg-primary px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-white">我的评价结果</h1>
          <p className="text-xs text-white/70 mt-0.5">{cycle?.name || '暂无问卷'}</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button type="button" onClick={() => navigate('/admin')}
              className="text-xs text-white/80 border border-white/30 rounded px-3 py-1.5">后台</button>
          )}
          <button type="button" onClick={signOut} className="text-xs text-white/60">退出</button>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-4">
        {!submission ? (
          <div className="card p-6 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">本轮暂未提交评价</p>
            <button type="button" onClick={() => navigate('/')} className="text-sm text-accent font-semibold">去填写 →</button>
          </div>
        ) : (
          <>
            {/* 提交信息 */}
            <div className="card p-4">
              <div className="section-anchor mb-3">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">提交信息</span>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">职级</span>
                  <span className="font-semibold text-foreground">{IDENTITY_LABELS[submission.identity]}</span>
                </div>
                <div className="divider" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">提交时间</span>
                  <span className="font-semibold text-foreground">{new Date(submission.created_at).toLocaleString('zh-CN')}</span>
                </div>
                <div className="divider" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">已评价人数</span>
                  <span className="font-semibold text-foreground">{new Set(ratings.map((r) => r.evaluatee_id)).size} 人</span>
                </div>
              </div>
            </div>

            {/* 评分明细 */}
            {evaluatees.filter((ev) => ratings.some((r) => r.evaluatee_id === ev.id)).map((ev) => {
              const evRatings = ratings.filter((r) => r.evaluatee_id === ev.id)
              const evDims = ev.identity === 'staff' ? dimensions.filter((d) => !d.leader_only) : dimensions
              const total = evRatings.reduce((s, r) => s + r.score, 0)
              const avg = evRatings.length > 0 ? Math.round((total / evRatings.length) * 10) / 10 : 0
              return (
                <div key={ev.id} className="card overflow-hidden">
                  <div className="px-4 py-3 bg-muted/60 flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{ev.name}</span>
                      <span className="text-xs text-muted-foreground">{IDENTITY_LABELS[ev.identity]}</span>
                    </div>
                    <span className="text-xs font-bold text-accent">均分 {avg}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {evDims.map((dim) => {
                      const r = evRatings.find((x) => x.dimension_id === dim.id)
                      return (
                        <div key={dim.id} className="px-4 py-2.5 flex items-center justify-between">
                          <span className="text-xs text-secondary">{dim.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-accent rounded-full" style={{ width: `${((r?.score || 0) / 10) * 100}%` }} />
                            </div>
                            <span className="text-xs font-bold text-foreground w-8 text-right">{r?.score ?? '-'}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
