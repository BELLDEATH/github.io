import { useState, useEffect, useCallback } from 'react'
import { getActiveCycle, getSurveyStats, getSurveyCycles } from '@/api/api'
import type { SurveyCycle } from '@/types/types'
import { IDENTITY_LABELS } from '@/types/types'

interface Stats {
  totalEvaluatees: number
  totalSubmissions: number
  completionRate: number
  dimensionStats: { dimension: string; avg: number; count: number }[]
  identityStats: { identity: string; count: number; avg: number }[]
}

export default function AdminDashboard() {
  const [cycle, setCycle] = useState<SurveyCycle | null>(null)
  const [cycles, setCycles] = useState<SurveyCycle[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [activeCycle, allCycles] = await Promise.all([getActiveCycle(), getSurveyCycles()])
      setCycles(allCycles)
      const selectedCycle = activeCycle || allCycles[0] || null
      setCycle(selectedCycle)
      if (selectedCycle) {
        const s = await getSurveyStats(selectedCycle.id)
        setStats(s)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCycleChange = async (id: string) => {
    const c = cycles.find((x) => x.id === id)
    if (!c) return
    setCycle(c)
    setStats(null)
    try {
      const s = await getSurveyStats(c.id)
      setStats(s)
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-secondary text-sm">加载中…</p>
    </div>
  )

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      {/* 周期选择 */}
      <div className="card p-4">
        <div className="section-anchor mb-3">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider">选择周期</span>
        </div>
        <select
          value={cycle?.id || ''}
          onChange={(e) => handleCycleChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded text-sm text-foreground bg-background"
        >
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.status === 'active' ? '进行中' : c.status === 'draft' ? '草稿' : '已结束'})</option>
          ))}
        </select>
      </div>

      {stats ? (
        <>
          {/* 核心指标 */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '总被评价人', value: stats.totalEvaluatees, unit: '人' },
              { label: '已提交', value: stats.totalSubmissions, unit: '份' },
              { label: '完成率', value: stats.completionRate, unit: '%' },
            ].map((item) => (
              <div key={item.label} className="card p-3 flex flex-col items-center gap-1">
                <span className="text-2xl font-bold text-primary">{item.value}<span className="text-sm font-normal text-muted-foreground">{item.unit}</span></span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>

          {/* 完成率进度条 */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-secondary">填报进度</span>
              <span className="text-xs font-bold text-primary">{stats.totalSubmissions} / {stats.totalEvaluatees}</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full progress-fill" style={{ width: `${stats.completionRate}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{stats.completionRate}% 已完成</p>
          </div>

          {/* 维度平均分 */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <div className="section-anchor">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">各维度平均分</span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {stats.dimensionStats.filter((d) => d.count > 0).map((d, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <span className="flex-1 text-sm text-foreground">{d.dimension}</span>
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${(d.avg / 10) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-accent w-10 text-right">{d.avg}</span>
                </div>
              ))}
              {stats.dimensionStats.every((d) => d.count === 0) && (
                <p className="px-4 py-4 text-sm text-muted-foreground">暂无评分数据</p>
              )}
            </div>
          </div>

          {/* 身份分布 */}
          {stats.identityStats.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <div className="section-anchor">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">各职级参与情况</span>
                </div>
              </div>
              <div className="divide-y divide-border">
                {stats.identityStats.map((item, i) => {
                  const label = IDENTITY_LABELS[item.identity as keyof typeof IDENTITY_LABELS] || item.identity
                  return (
                    <div key={i} className="px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-foreground">{label}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{item.count} 人</span>
                        <span className="font-bold text-primary">均 {item.avg} 分</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card p-8 flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">暂无统计数据</p>
        </div>
      )}
    </div>
  )
}
