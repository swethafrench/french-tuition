'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import api from '@/lib/api'

export default function StudentLoginPage() {
  const router = useRouter()
  const [mobile, setMobile] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!mobile || !passcode) {
      setError('Please enter your mobile number and passcode.')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/api/student-auth', { mobile, passcode })
      localStorage.setItem('student_token', res.data.token)
      localStorage.setItem('student', JSON.stringify(res.data.student))
      router.push('/student/calendar')
    } catch {
      setError('Invalid mobile number or PIN. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f2044] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/apprenons.png" alt="Apprenons Logo" width={180} height={180} className="rounded-2xl mb-4" />
          <p className="text-blue-200 text-sm">Student portal</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          {error && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Mobile number</label>
            <input
              type="tel"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+91 98765 43210"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">4-digit passcode</label>
            <input
              type="password"
              maxLength={4}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest text-center text-lg"
              placeholder="----"
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
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
        <p className="text-center text-xs text-blue-300 mt-4">
          Your mobile number and PIN are provided by your teacher.
        </p>
      </div>
    </div>
  )
}
