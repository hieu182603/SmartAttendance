import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import VerifyOtp from './components/auth/VerifyOtp'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'

function Dashboard() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-semibold">SmartAttendance</Link>
          <div className="flex items-center gap-3 text-sm">
            <span>{user?.name} · {user?.email}</span>
            <button onClick={logout} className="rounded-lg bg-slate-800 px-3 py-1 hover:bg-slate-700">Đăng xuất</button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">Trang chính</h1>
        <p className="text-slate-400">Bạn đã đăng nhập thành công.</p>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}

