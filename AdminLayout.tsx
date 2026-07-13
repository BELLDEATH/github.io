import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const NAV = [
  { to: '/admin', label: '数据总览', icon: '▤', end: true },
  { to: '/admin/data', label: '原始数据', icon: '≡', end: false },
  { to: '/admin/survey', label: '问卷管理', icon: '✎', end: false },
  { to: '/admin/users', label: '权限管理', icon: '⊙', end: false },
]

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="app-container min-h-screen flex flex-col bg-muted">
      <div className="brand-bar" />

      {/* 顶部栏 */}
      <div className="bg-primary px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-sm font-semibold text-white">管理后台</h1>
          <p className="text-xs text-white/60 mt-0.5">{profile?.nickname || '管理员'} · {profile?.role === 'super_admin' ? '超管' : '管理员'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/')} className="text-xs text-white/60">员工端</button>
          <button type="button" onClick={signOut} className="text-xs text-white/60">退出</button>
        </div>
      </div>

      {/* 导航 Tab */}
      <div className="bg-white border-b border-border flex overflow-x-auto sticky top-[calc(3rem+4px)] z-10">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex-shrink-0 px-4 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`
            }
          >
            <span>{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
