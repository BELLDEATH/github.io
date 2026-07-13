import { useState, useEffect, useCallback } from 'react'
import {
  getSurveyCycles, createSurveyCycle, updateSurveyCycleStatus, updateSurveyCycleName, deleteSurveyCycle,
  getEvaluatees, addEvaluatee, deleteEvaluatee,
  getDimensions, addDimension, deleteDimension,
  getDepartments,
} from '@/api/api'
import type { SurveyCycle, Evaluatee, Dimension } from '@/types/types'
import { IDENTITY_LABELS, IDENTITY_ORDER } from '@/types/types'

export default function AdminSurvey() {
  const [cycles, setCycles] = useState<SurveyCycle[]>([])
  const [selectedCycle, setSelectedCycle] = useState<SurveyCycle | null>(null)
  const [evaluatees, setEvaluatees] = useState<Evaluatee[]>([])
  const [dimensions, setDimensions] = useState<Dimension[]>([])
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)

  // 新建周期
  const [newCycleName, setNewCycleName] = useState('')
  const [addingCycle, setAddingCycle] = useState(false)
  const [showNewCycle, setShowNewCycle] = useState(false)

  // 编辑周期名
  const [editCycleName, setEditCycleName] = useState('')
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null)

  // 新增被评价人
  const [newEvName, setNewEvName] = useState('')
  const [newEvIdentity, setNewEvIdentity] = useState<'department_leader' | 'section_chief' | 'deputy_section_chief' | 'staff'>('staff')
  const [addingEv, setAddingEv] = useState(false)
  const [showNewEv, setShowNewEv] = useState(false)

  // 批量导入
  const [bulkText, setBulkText] = useState('')
  const [showBulk, setShowBulk] = useState(false)

  // 新增维度
  const [newDimName, setNewDimName] = useState('')
  const [newDimLeaderOnly, setNewDimLeaderOnly] = useState(false)
  const [showNewDim, setShowNewDim] = useState(false)
  const [addingDim, setAddingDim] = useState(false)

  const loadCycles = useCallback(async () => {
    setLoading(true)
    try {
      const [cs, dims, depts] = await Promise.all([getSurveyCycles(), getDimensions(), getDepartments()])
      setCycles(cs)
      setDimensions(dims)
      setDepartments(depts)
      if (cs.length > 0 && !selectedCycle) {
        const active = cs.find((c) => c.status === 'active') || cs[0]
        setSelectedCycle(active)
        const evs = await getEvaluatees(active.id)
        setEvaluatees(evs)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selectedCycle])

  useEffect(() => { loadCycles() }, [])

  const handleSelectCycle = async (c: SurveyCycle) => {
    setSelectedCycle(c)
    const evs = await getEvaluatees(c.id)
    setEvaluatees(evs)
  }

  const handleCreateCycle = async () => {
    if (!newCycleName.trim()) return
    setAddingCycle(true)
    try {
      await createSurveyCycle(newCycleName.trim())
      setNewCycleName('')
      setShowNewCycle(false)
      const cs = await getSurveyCycles()
      setCycles(cs)
    } finally {
      setAddingCycle(false)
    }
  }

  const handleStatusChange = async (id: string, status: 'draft' | 'active' | 'closed') => {
    // 激活前先关闭其他进行中的
    if (status === 'active') {
      for (const c of cycles) {
        if (c.status === 'active' && c.id !== id) await updateSurveyCycleStatus(c.id, 'closed')
      }
    }
    await updateSurveyCycleStatus(id, status)
    const cs = await getSurveyCycles()
    setCycles(cs)
  }

  const handleSaveCycleName = async (id: string) => {
    if (!editCycleName.trim()) return
    await updateSurveyCycleName(id, editCycleName.trim())
    setEditingCycleId(null)
    const cs = await getSurveyCycles()
    setCycles(cs)
  }

  const handleDeleteCycle = async (id: string) => {
    if (!confirm('确认删除该周期？将同步删除所有相关被评价人记录。')) return
    await deleteSurveyCycle(id)
    const cs = await getSurveyCycles()
    setCycles(cs)
    if (selectedCycle?.id === id) {
      setSelectedCycle(cs[0] || null)
      setEvaluatees(cs[0] ? await getEvaluatees(cs[0].id) : [])
    }
  }

  const handleAddEvaluatee = async () => {
    if (!newEvName.trim() || !selectedCycle) return
    setAddingEv(true)
    try {
      await addEvaluatee({ name: newEvName.trim(), department: null, identity: newEvIdentity, cycle_id: selectedCycle.id })
      setNewEvName('')
      setShowNewEv(false)
      const evs = await getEvaluatees(selectedCycle.id)
      setEvaluatees(evs)
    } finally {
      setAddingEv(false)
    }
  }

  const handleBulkImport = async () => {
    if (!selectedCycle || !bulkText.trim()) return
    const lines = bulkText.trim().split('\n').filter((l) => l.trim())
    for (const line of lines) {
      const parts = line.split(/[,，\t\s]+/).filter(Boolean)
      if (parts.length < 2) continue
      const name = parts[0]
      const raw = parts[1]
      let identity: 'department_leader' | 'section_chief' | 'deputy_section_chief' | 'staff' = 'staff'
      if (raw.includes('部领导') || raw.includes('部长')) identity = 'department_leader'
      else if (raw.includes('副科')) identity = 'deputy_section_chief'
      else if (raw.includes('科长')) identity = 'section_chief'
      await addEvaluatee({ name, department: null, identity, cycle_id: selectedCycle.id })
    }
    setBulkText('')
    setShowBulk(false)
    const evs = await getEvaluatees(selectedCycle.id)
    setEvaluatees(evs)
  }

  const handleDeleteEvaluatee = async (id: string) => {
    if (!confirm('确认删除该被评价人？')) return
    await deleteEvaluatee(id)
    if (selectedCycle) {
      const evs = await getEvaluatees(selectedCycle.id)
      setEvaluatees(evs)
    }
  }

  const handleAddDimension = async () => {
    if (!newDimName.trim()) return
    setAddingDim(true)
    try {
      await addDimension(newDimName.trim(), newDimLeaderOnly)
      setNewDimName('')
      setNewDimLeaderOnly(false)
      setShowNewDim(false)
      const dims = await getDimensions()
      setDimensions(dims)
    } finally {
      setAddingDim(false)
    }
  }

  const handleDeleteDimension = async (id: string) => {
    if (!confirm('确认删除该维度？')) return
    await deleteDimension(id)
    const dims = await getDimensions()
    setDimensions(dims)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-secondary text-sm">加载中…</p>
    </div>
  )

  return (
    <div className="px-4 py-5 flex flex-col gap-5">

      {/* 问卷周期管理 */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="section-anchor">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">问卷周期</span>
          </div>
          <button type="button" onClick={() => setShowNewCycle(!showNewCycle)}
            className="text-xs text-accent font-semibold">+ 新建</button>
        </div>

        {showNewCycle && (
          <div className="px-4 py-3 bg-muted/40 border-b border-border flex gap-2">
            <input
              value={newCycleName}
              onChange={(e) => setNewCycleName(e.target.value)}
              placeholder="周期名称，如 2025年第一季度"
              className="flex-1 px-3 py-2 border border-border rounded text-sm bg-background text-foreground"
            />
            <button type="button" onClick={handleCreateCycle} disabled={addingCycle || !newCycleName.trim()}
              className="px-4 py-2 bg-primary text-white rounded text-sm font-semibold disabled:opacity-50">创建</button>
          </div>
        )}

        <div className="divide-y divide-border">
          {cycles.map((c) => (
            <div key={c.id} className="px-4 py-3">
              {editingCycleId === c.id ? (
                <div className="flex gap-2">
                  <input
                    value={editCycleName}
                    onChange={(e) => setEditCycleName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-border rounded text-sm bg-background"
                  />
                  <button type="button" onClick={() => handleSaveCycleName(c.id)}
                    className="px-3 py-1.5 bg-primary text-white rounded text-xs font-semibold">保存</button>
                  <button type="button" onClick={() => setEditingCycleId(null)}
                    className="px-3 py-1.5 border border-border rounded text-xs text-muted-foreground">取消</button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button type="button" onClick={() => handleSelectCycle(c)}
                      className={`text-sm truncate font-medium text-left ${selectedCycle?.id === c.id ? 'text-primary font-semibold' : 'text-foreground'}`}>
                      {c.name}
                    </button>
                    <span className={`badge text-xs flex-shrink-0 ${c.status === 'active' ? 'bg-green-100 text-green-700' : c.status === 'draft' ? 'bg-muted text-muted-foreground' : 'bg-orange-100 text-orange-700'}`}>
                      {c.status === 'active' ? '进行中' : c.status === 'draft' ? '草稿' : '已结束'}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {c.status !== 'active' && (
                      <button type="button" onClick={() => handleStatusChange(c.id, 'active')}
                        className="text-xs text-green-600 border border-green-200 rounded px-2 py-1">启用</button>
                    )}
                    {c.status === 'active' && (
                      <button type="button" onClick={() => handleStatusChange(c.id, 'closed')}
                        className="text-xs text-orange-600 border border-orange-200 rounded px-2 py-1">结束</button>
                    )}
                    <button type="button" onClick={() => { setEditingCycleId(c.id); setEditCycleName(c.name) }}
                      className="text-xs text-muted-foreground border border-border rounded px-2 py-1">改名</button>
                    <button type="button" onClick={() => handleDeleteCycle(c.id)}
                      className="text-xs text-destructive border border-red-200 rounded px-2 py-1">删除</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 被评价人管理 */}
      {selectedCycle && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between mb-1">
              <div className="section-anchor">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">被评价人</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowBulk(!showBulk); setShowNewEv(false) }}
                  className="text-xs text-muted-foreground border border-border rounded px-2 py-1">批量导入</button>
                <button type="button" onClick={() => { setShowNewEv(!showNewEv); setShowBulk(false) }}
                  className="text-xs text-accent font-semibold">+ 添加</button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              当前周期：{selectedCycle.name} · 共 {evaluatees.length} 人
            </p>
          </div>

          {showNewEv && (
            <div className="px-4 py-3 bg-muted/40 border-b border-border flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={newEvName}
                  onChange={(e) => setNewEvName(e.target.value)}
                  placeholder="姓名"
                  className="flex-1 px-3 py-2 border border-border rounded text-sm bg-background"
                />
                <select
                  value={newEvIdentity}
                  onChange={(e) => setNewEvIdentity(e.target.value as typeof newEvIdentity)}
                  className="px-3 py-2 border border-border rounded text-sm bg-background text-foreground"
                >
                  {IDENTITY_ORDER.map((id) => (
                    <option key={id} value={id}>{IDENTITY_LABELS[id]}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={handleAddEvaluatee} disabled={addingEv || !newEvName.trim()}
                className="w-full bg-primary text-white py-2 rounded text-sm font-semibold disabled:opacity-50">添加</button>
            </div>
          )}

          {showBulk && (
            <div className="px-4 py-3 bg-muted/40 border-b border-border flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">每行一条：姓名+空格/逗号+职级（部领导/科长/副科长/科员）</p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={5}
                placeholder={"张三 科长\n李四 科员\n王五 部领导"}
                className="w-full px-3 py-2 border border-border rounded text-sm bg-background text-foreground resize-none"
              />
              <button type="button" onClick={handleBulkImport} disabled={!bulkText.trim()}
                className="w-full bg-primary text-white py-2 rounded text-sm font-semibold disabled:opacity-50">导入</button>
            </div>
          )}

          {/* 按身份分组展示 */}
          {IDENTITY_ORDER.map((g) => {
            const gEvs = evaluatees.filter((e) => e.identity === g)
            if (gEvs.length === 0) return null
            return (
              <div key={g}>
                <div className="px-4 py-2 bg-muted/30 border-b border-border">
                  <span className="text-xs font-semibold text-secondary">{IDENTITY_LABELS[g]} ({gEvs.length}人)</span>
                </div>
                <div className="divide-y divide-border">
                  {gEvs.map((ev) => (
                    <div key={ev.id} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-sm text-foreground">{ev.name}</span>
                      <button type="button" onClick={() => handleDeleteEvaluatee(ev.id)}
                        className="text-xs text-destructive">删除</button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {evaluatees.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">暂无被评价人，请添加</div>
          )}
        </div>
      )}

      {/* 评价维度管理 */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="section-anchor">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">评价维度</span>
          </div>
          <button type="button" onClick={() => setShowNewDim(!showNewDim)}
            className="text-xs text-accent font-semibold">+ 添加</button>
        </div>

        {showNewDim && (
          <div className="px-4 py-3 bg-muted/40 border-b border-border flex flex-col gap-2">
            <input
              value={newDimName}
              onChange={(e) => setNewDimName(e.target.value)}
              placeholder="维度名称，如「工作质量」"
              className="w-full px-3 py-2 border border-border rounded text-sm bg-background"
            />
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={newDimLeaderOnly}
                onChange={(e) => setNewDimLeaderOnly(e.target.checked)}
                className="w-4 h-4"
              />
              仅领导职级需评分（部领导/科长/副科长）
            </label>
            <button type="button" onClick={handleAddDimension} disabled={addingDim || !newDimName.trim()}
              className="w-full bg-primary text-white py-2 rounded text-sm font-semibold disabled:opacity-50">添加维度</button>
          </div>
        )}

        <div className="divide-y divide-border">
          {dimensions.map((d, i) => (
            <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs w-5 h-5 rounded-full bg-muted flex items-center justify-center text-secondary font-bold flex-shrink-0">{i + 1}</span>
                <span className="text-sm text-foreground truncate">{d.name}</span>
                {d.leader_only && <span className="badge bg-muted text-xs text-muted-foreground flex-shrink-0">仅领导</span>}
              </div>
              <button type="button" onClick={() => handleDeleteDimension(d.id)}
                className="text-xs text-destructive flex-shrink-0">删除</button>
            </div>
          ))}
        </div>
      </div>

      {/* 科室说明 */}
      {departments.length > 0 && (
        <div className="card p-4">
          <div className="section-anchor-accent mb-3">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">科室列表（{departments.length}个）</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {departments.map((d) => (
              <span key={d.id} className="badge bg-muted text-secondary text-xs">{d.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
