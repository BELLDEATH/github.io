import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getActiveCycle, getMySubmission, getDepartments } from '@/api/api'
import type { IdentityType } from '@/types/types'
import { IDENTITY_LABELS, IDENTITY_ORDER } from '@/types/types'

export default function Identity() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [identity, setIdentity] = useState<IdentityType>('staff')
  const [deptId, setDeptId] = useState('')
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [cycle, setCycle] = useState<{ id: string; name: string; status: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const [activeCycle, depts] = await Promise.all([getActiveCycle(), getDepartments()])
      setCycle(activeCycle)
      setDepartments(depts)
      if (activeCycle) {
        const sub = await getMySubmission(activeCycle.id, user.id)
        if (sub) { setAlreadySubmitted(true); navigate('/result') }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user, navigate])

  useEffect(() => { loadData() }, [loadData])

  const handleStart = async () => {
    if (!deptId) { alert('请选择所属科室'); return }
    if (!cycle || cycle.status !== 'active') { alert('当前没有进行中的问卷'); return }
    setSubmitting(true)
    sessionStorage.setItem('survey_identity', identity)
    sessionStorage.setItem('survey_dept_id', deptId)
    sessionStorage.setItem('survey_dept_name', departments.find((d) => d.id === deptId)?.name || '')
    navigate('/survey')
    setSubmitting(false)
  }

  if (loading) return (
    <div className="app-container min-h-screen flex items-center justify-center bg-background">
      <p className="text-secondary text-sm">加载中…</p>
    </div>
  )

  return (
    <div className="app-container min-h-screen bg-muted flex flex-col">
      <div className="brand-bar" />

      {/* 顶部导航 */}
      <div className="bg-primary px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-white">员工互评系统</h1>
          <p className="text-xs text-white/70 mt-0.5">欢迎，{profile?.nickname || '用户'}</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button type="button" onClick={() => navigate('/admin')}
              className="text-xs text-white/80 border border-white/30 rounded px-3 py-1.5">
              管理后台
            </button>
          )}
          <button type="button" onClick={signOut} className="text-xs text-white/60">退出</button>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-4">
        {/* 当前问卷状态 */}
        <div className="card p-4">
          <div className="section-anchor mb-3">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">当前问卷</span>
          </div>
          {cycle ? (
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{cycle.name}</span>
              <span className={`badge text-xs ${cycle.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                {cycle.status === 'active' ? '进行中' : cycle.status === 'draft' ? '未开始' : '已结束'}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无进行中的问卷</p>
          )}
        </div>

        {cycle?.status === 'active' && !alreadySubmitted && (
          <>
            {/* 职级选择 */}
            <div className="card p-4">
              <div className="section-anchor mb-3">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">我的职级</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {IDENTITY_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setIdentity(id)}
                    className={`py-3 rounded text-sm font-semibold border transition-colors ${identity === id ? 'bg-primary text-white border-primary' : 'bg-background text-foreground border-border'}`}
                  >
                    {IDENTITY_LABELS[id]}
                  </button>
                ))}
              </div>
            </div>

            {/* 科室选择 */}
            <div className="card p-4">
              <div className="section-anchor mb-3">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">所属科室</span>
              </div>
              <select
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded text-sm text-foreground bg-background"
              >
                <option value="">请选择科室</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={submitting || !deptId}
              className="w-full bg-primary text-white py-4 rounded text-sm font-semibold disabled:opacity-50"
            >
              开始评价 →
            </button>
          </>
        )}

        {alreadySubmitted && (
          <div className="card p-5 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-foreground">本轮评价已完成</p>
            <button type="button" onClick={() => navigate('/result')}
              className="text-sm text-accent font-semibold">查看我的结果 →</button>
          </div>
        )}

        {/* 说明 */}
        <div className="card p-4">
          <div className="section-anchor-accent mb-3">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">评价说明</span>
          </div>
          <ul className="flex flex-col gap-2 text-xs text-muted-foreground leading-relaxed">
            <li>· 10分制矩阵量表，对每位同事逐项打分</li>
            <li>· 科员评6个维度，其他职级评7个维度（含管理领导力）</li>
            <li>· 每轮问卷仅可提交一次，提交后不可修改</li>
            <li>· 所有评价完全匿名展示，管理员后台需二次验证</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
