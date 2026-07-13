import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Login from '@/pages/Login'
import Identity from '@/pages/Identity'
import Survey from '@/pages/Survey'
import Result from '@/pages/Result'
import AdminLayout from '@/pages/admin/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminData from '@/pages/admin/AdminData'
import AdminSurvey from '@/pages/admin/AdminSurvey'
import AdminUsers from '@/pages/admin/AdminUsers'

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="app-container flex items-center justify-center min-h-screen">
      <div className="text-secondary text-sm">加载中…</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Identity /></RequireAuth>} />
          <Route path="/survey" element={<RequireAuth><Survey /></RequireAuth>} />
          <Route path="/result" element={<RequireAuth><Result /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><RequireAdmin><AdminLayout /></RequireAdmin></RequireAuth>}>
            <Route index element={<AdminDashboard />} />
            <Route path="data" element={<AdminData />} />
            <Route path="survey" element={<AdminSurvey />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
