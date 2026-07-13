import { useState, useEffect, useCallback } from 'react'
import { getActiveCycle, getSurveyCycles, getAllSubmissions, getAllRatings, getEvaluatees, getDimensions, getAdminSetting, deleteSubmissionWithRatings, exportRatingsCSV } from '@/api/api'
import type { Submission, Evaluatee, Dimension, SurveyCycle } from '@/types/types'
import { IDENTITY_LABELS } from '@/types/types'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminData() {
  const { profile } = useAuth()
  const isSuperAdmin = profile?.role === 'super_admin'

  const [verified, setVerified] = useState(false)
  const [verifyInput, setVerifyInput] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)

  const [cycle, setCycle] = useState<SurveyCycle | null>(null)
  const [cycles, setCycles] = useState<SurveyCycle[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [evaluatees, setEvaluatees] = useState<Evaluatee[]>([])
  const [dimensions, setDimensions] = useState<Dimension[]>([])
  const [loading, setLoading] = useState(false)
  const [filterIdentity, setFilterIdentity] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const handleVerify = async () => {
    setVerifyLoading(true)
    setVerifyError('')
    try {
      const stored = await getAdminSetting('secondary_password')
      if (verifyInput === stored) {
        setVerified(true)
      } else {
        setVerifyError('验证密码错误')
      }
    } catch {
      setVerifyError('验证失败，请重试')
    } finally {
      setVerifyLoading(false)
    }
  }

  const loadData = useCallback(async (cycleId: string) => {
    setLoading(true)
    try {
      const [subs, evs, dims] = await Promise.all([
        getAllSubmissions(cycleId),
        getEvaluatees(cycleId),
        getDimensions(),
      ])
      setSubmissions(subs)
      setEvaluatees(evs)
      setDimensions(dims)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!verified) return
    const init = async () => {
      const [activeCycle, allCycles] = await Promise.all([getActiveCycle(), getSurveyCycles()])
      setCycles(allCycles)
      const selected = activeCycle || allCycles[0] || null
      setCycle(selected)
      if (selected) loadData(selected.id)
    }
    init()
  }, [verified, loadData])

  const handleCycleChange = (id: string) => {
    const c = cycles.find((x) => x.id === id)
    if (!c) return
    setCycle(c)
    loadData(c.id)
  }

  const handleExport = async () => {
    if (!cycle) return
    setExportLoading(true)
    try {
      const csv = await exportRatingsCSV(cycle.id)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `评价数据_${cycle.name}_${new Date().toLocaleDateString('zh-CN')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('导出失败')
    } finally {
      setExportLoading(false)
    }
  }

  const handleDelete = async (sub: Submission) => {
    if (!isSuperAdmin) return
    try {
      await deleteSubmissionWithRatings(sub.id, sub.user_id, sub.cycle_id)
      setDeleteConfirmId(null)
      if (cycle) loadData(cycle.id)
    } catch {
      alert('删除失败')
    }
  }

  const filtered = filterIdentity
    ? submissions.filter((s) => s.identity === filterIdentity)
    : submissions

  // 二次验证界面
  if (!verified) {
    return (
      <div className="px-4 py-5">
        <div className="card p-5">
          <div className="section-anchor mb-4">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">二次身份验证</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">查看原始数据需要输入验证密码，以保障数据安全</p>
          <input
            type="password"
            value={verifyInput}
            onChange={(e) => setVerifyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            placeholder="请输入二次验证密码"
            className="w-full px-4 py-3 border border-border rounded text-sm text-foreground bg-background mb-3"
          />
          {verifyError && <p className="text-xs text-destructive mb-3">{verifyError}</p>}
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifyLoading || !verifyInput}
            className="w-full bg-primary text-white py-3 rounded text-sm font-semibold disabled:opacity-50"
          >
            {verifyLoading ? '验证中…' : '确认验证'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      {/* 工具栏 */}
      <div className="card p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <select
            value={cycle?.id || ''}
            onChange={(e) => handleCycleChange(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-border rounded text-sm text-foreground bg-background"
          >
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExport}
            disabled={exportLoading || submissions.length === 0}
            className="px-4 py-2.5 bg-accent text-white rounded text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
          >
            {exportLoading ? '导出中…' : '导出 CSV'}
          </button>
        </div>

        <select
          value={filterIdentity}
          onChange={(e) => setFilterIdentity(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded text-sm text-foreground bg-background"
        >
          <option value="">全部职级</option>
          {(['department_leader', 'section_chief', 'deputy_section_chief', 'staff'] as const).map((id) => (
            <option key={id} value={id}>{IDENTITY_LABELS[id]}</option>
          ))}
        </select>
      </div>

      {/* 统计小条 */}
      <div className="flex gap-3">
        <div className="flex-1 card p-3 text-center">
          <p className="text-xl font-bold text-primary">{submissions.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">总提交</p>
        </div>
        <div className="flex-1 card p-3 text-center">
          <p className="text-xl font-bold text-accent">{filtered.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">筛选结果</p>
        </div>
        <div className="flex-1 card p-3 text-center">
          <p className="text-xl font-bold text-secondary">{evaluatees.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">被评价人</p>
        </div>
      </div>

      {/* 数据列表 */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-muted-foreground text-sm">暂无提交记录</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((sub) => {
            const subRatings_map: Record<string, { evName: string; evIdentity: string; dims: { name: string; score: number | undefined }[] }> = {}
            for (const ev of evaluatees) {
              subRatings_map[ev.id] = {
                evName: ev.name,
                evIdentity: ev.identity,
                dims: dimensions.map((d) => ({ name: d.name, score: undefined })),
              }
            }
            const isExpanded = deleteConfirmId === sub.id
            return (
              <div key={sub.id} className="card overflow-hidden">
                <div className="px-4 py-3 bg-muted/40 border-b border-border flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">{sub.nickname || '匿名'}</span>
                      <span className="badge bg-muted text-secondary text-xs">{IDENTITY_LABELS[sub.identity]}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(sub.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleDelete(sub)}
                            className="text-xs text-white bg-destructive px-2 py-1 rounded">确认删除</button>
                          <button type="button" onClick={() => setDeleteConfirmId(null)}
                            className="text-xs text-muted-foreground">取消</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setDeleteConfirmId(sub.id)}
                          className="text-xs text-muted-foreground border border-border rounded px-2 py-1">删除</button>
                      )}
                    </div>
                  )}
                </div>
                {/* 评分摘要 */}
                <div className="px-4 py-2">
                  <p className="text-xs text-muted-foreground">
                    评价了 {evaluatees.filter((ev) => ev.id !== sub.user_id).length} 位同事
                    · {dimensions.length} 维度
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 维度表头说明 */}
      {dimensions.length > 0 && (
        <div className="card p-4">
          <div className="section-anchor-accent mb-3">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">评价维度说明</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {dimensions.map((d, i) => (
              <div key={d.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-secondary font-bold flex-shrink-0">{i + 1}</span>
                <span>{d.name}</span>
                {d.leader_only && <span className="badge bg-muted text-xs text-muted-foreground">仅领导</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
