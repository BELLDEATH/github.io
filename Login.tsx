import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) { setError('请填写用户名和密码'); return }
    setLoading(true)
    setError('')
    try {
      if (tab === 'login') {
        const { error: err } = await signIn(username.trim(), password)
        if (err) { setError('用户名或密码错误'); return }
      } else {
        if (password.length < 6) { setError('密码至少6位'); return }
        const { error: err } = await signUp(username.trim(), password)
        if (err) { setError(err.message.includes('already') ? '用户名已存在' : '注册失败，请重试'); return }
        // 注册后自动登录
        const { error: loginErr } = await signIn(username.trim(), password)
        if (loginErr) { setError('注册成功，请手动登录'); setTab('login'); return }
      }
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container min-h-screen bg-muted flex flex-col">
      <div className="brand-bar" />

      {/* 品牌头部 */}
      <div className="bg-primary px-6 pt-10 pb-8">
        <h1 className="text-2xl font-semibold text-white tracking-wide">员工互评匿名打分系统</h1>
        <p className="text-sm text-white/70 mt-1">部门内部评价 · 完全匿名</p>
      </div>

      {/* 登录卡片 */}
      <div className="flex-1 flex flex-col px-4 pt-6">
        <div className="card p-6">
          {/* 切换 Tab */}
          <div className="flex border-b border-border mb-6">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${tab === t ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground'}`}
              >
                {t === 'login' ? '登录' : '注册新账号'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wider">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                className="w-full px-4 py-3 border border-border rounded text-sm text-foreground bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wider">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === 'register' ? '至少6位' : '请输入密码'}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-3 border border-border rounded text-sm text-foreground bg-background"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded px-4 py-2 text-sm text-destructive">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded text-sm font-semibold disabled:opacity-50 mt-1"
            >
              {loading ? '处理中…' : tab === 'login' ? '登录' : '注册并登录'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed px-4">
          本系统仅供部门内部员工使用，所有评价数据完全匿名
        </p>
      </div>
    </div>
  )
}
