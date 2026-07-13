import { useState, useEffect, useCallback } from 'react'
import { getAllProfiles, updateUserRole, getAdminSetting, updateAdminSetting } from '@/api/api'
import type { Profile } from '@/types/types'
import { useAuth } from '@/contexts/AuthContext'

const ROLE_LABELS = { user: '普通员工', admin: '管理员', super_admin: '超级管理员' }
const ROLE_COLORS = {
  user: 'bg-muted text-muted-foreground',
  admin: 'bg-blue-100 text-blue-700',
  super_admin: 'bg-purple-100 text-purple-700',
}

export default function AdminUsers() {
  const { user: currentUser, profile: currentProfile } = useAuth()
  const isSuperAdmin = currentProfile?.role === 'super_admin'
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [changingId, setChangingId] = useState<string | null>(null)

  // 二次验证密码管理
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMsg, setPwdMsg] = useState('')

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const ps = await getAllProfiles()
      setProfiles(ps)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProfiles() }, [loadProfiles])

  const handleRoleChange = async (userId: string, role: 'user' | 'admin' | 'super_admin') => {
    if (!isSuperAdmin) { alert('只有超级管理员可修改角色'); return }
    if (userId === currentUser?.id) { alert('不能修改自己的角色'); return }
    setChangingId(userId)
    try {
      await updateUserRole(userId, role)
      await loadProfiles()
    } finally {
      setChangingId(null)
    }
  }

  const handleChangePwd = async () => {
    if (!newPwd.trim()) { setPwdMsg('请输入新密码'); return }
    if (newPwd.length < 4) { setPwdMsg('密码至少4位'); return }
    setPwdLoading(true)
    setPwdMsg('')
    try {
      const stored = await getAdminSetting('secondary_password')
      if (currentPwd !== stored) { setPwdMsg('当前密码错误'); return }
      await updateAdminSetting('secondary_password', newPwd)
      setPwdMsg('✓ 密码修改成功')
      setCurrentPwd('')
      setNewPwd('')
    } catch {
      setPwdMsg('修改失败，请重试')
    } finally {
      setPwdLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-secondary text-sm">加载中…</p>
    </div>
  )

  const grouped = {
    super_admin: profiles.filter((p) => p.role === 'super_admin'),
    admin: profiles.filter((p) => p.role === 'admin'),
    user: profiles.filter((p) => p.role === 'user'),
  }

  return (
    <div className="px-4 py-5 flex flex-col gap-5">

      {/* 说明 */}
      <div className="card p-4">
        <div className="section-anchor mb-3">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider">权限说明</span>
        </div>
        <div className="flex flex-col gap-2 text-xs text-muted-foreground leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="badge bg-purple-100 text-purple-700 flex-shrink-0">超管</span>
            <span>可管理所有功能：问卷管理、数据查看与导出、权限管理、删除记录</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="badge bg-blue-100 text-blue-700 flex-shrink-0">管理员</span>
            <span>可查看数据和导出CSV，无法修改问卷配置和删除记录</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="badge bg-muted text-muted-foreground flex-shrink-0">员工</span>
            <span>仅可查看自己的评价结果</span>
          </div>
        </div>
      </div>

      {/* 用户列表 */}
      {(['super_admin', 'admin', 'user'] as const).map((role) => {
        const ps = grouped[role]
        if (ps.length === 0) return null
        return (
          <div key={role} className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <span className={`badge text-xs ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>
              <span className="text-xs text-muted-foreground">{ps.length} 人</span>
            </div>
            <div className="divide-y divide-border">
              {ps.map((p) => (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.nickname || '未设置昵称'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(p.created_at).toLocaleDateString('zh-CN')} 注册
                      {p.id === currentUser?.id && ' · 当前账号'}
                    </p>
                  </div>
                  {isSuperAdmin && p.id !== currentUser?.id && (
                    <select
                      value={p.role}
                      onChange={(e) => handleRoleChange(p.id, e.target.value as 'user' | 'admin' | 'super_admin')}
                      disabled={changingId === p.id}
                      className="px-2 py-1.5 border border-border rounded text-xs text-foreground bg-background"
                    >
                      <option value="user">普通员工</option>
                      <option value="admin">管理员</option>
                      <option value="super_admin">超管</option>
                    </select>
                  )}
                  {(!isSuperAdmin || p.id === currentUser?.id) && (
                    <span className={`badge text-xs ${ROLE_COLORS[p.role]}`}>{ROLE_LABELS[p.role]}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* 二次验证密码管理 */}
      {isSuperAdmin && (
        <div className="card p-4">
          <div className="section-anchor mb-4">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">修改数据查看密码</span>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">当前验证密码</label>
              <input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="请输入当前密码"
                className="w-full px-3 py-2.5 border border-border rounded text-sm bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">新验证密码</label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="请输入新密码（至少4位）"
                className="w-full px-3 py-2.5 border border-border rounded text-sm bg-background text-foreground"
              />
            </div>
            {pwdMsg && (
              <p className={`text-xs ${pwdMsg.startsWith('✓') ? 'text-green-600' : 'text-destructive'}`}>{pwdMsg}</p>
            )}
            <button
              type="button"
              onClick={handleChangePwd}
              disabled={pwdLoading || !currentPwd || !newPwd}
              className="w-full bg-primary text-white py-3 rounded text-sm font-semibold disabled:opacity-50"
            >
              {pwdLoading ? '修改中…' : '确认修改'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
