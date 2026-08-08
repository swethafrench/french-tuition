'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StudentProfilePage() {
  const router = useRouter()
  const [student, setStudent] = useState<{
    name: string; reg_number: string; grade: string; school_name: string; mode: string
  } | null>(null)

  useEffect(() => {
    const s = localStorage.getItem('student')
    if (s) setStudent(JSON.parse(s))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('student_token')
    localStorage.removeItem('student')
    router.push('/student/login')
  }

  const initials = student?.name.split(' ').map(n => n[0]).join('').slice(0, 2) ?? 'ST'

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-semibold mb-3">
          {initials}
        </div>
        <h2 className="text-base font-semibold text-gray-900">{student?.name}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{student?.reg_number}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        {[
          { label: 'School', value: student?.school_name },
          { label: 'Grade', value: student?.grade },
          { label: 'Mode', value: student?.mode },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0 text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-900 capitalize">{value ?? '-'}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}
