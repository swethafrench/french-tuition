'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import api from '@/lib/api'

export default function TeacherLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!username || !password) {
      setError('Please enter username and password.')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/api/teacher-auth', { username, password })
      localStorage.setItem('teacher_token', res.data.token)
      localStorage.setItem('teacher', JSON.stringify(res.data.teacher))
      router.push('/teacher/dashboard')
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f2044] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/apprenons.png" alt="Apprenons Logo" width={180} height={180} className="rounded-2xl mb-4" />
          <p className="text-blue-200 text-sm">Teacher portal</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          {error && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Username</label>
            <input
              type="text"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
            <input
              type="password"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 text-sm font-medium text-white bg-[#0f2044] rounded-lg hover:bg-blue-900 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
