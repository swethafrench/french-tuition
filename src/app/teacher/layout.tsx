'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  LayoutDashboard, UserPlus, CalendarDays,
  ClipboardCheck, BarChart2, CreditCard,
  Settings, Users, LogOut
} from 'lucide-react'

const navItems = [
  { href: '/teacher/dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/teacher/students',   label: 'Students',         icon: Users },
  { href: '/teacher/register',   label: 'Register student', icon: UserPlus },
  { href: '/teacher/schedule',   label: 'Schedule',         icon: CalendarDays },
  { href: '/teacher/attendance', label: 'Mark attendance',  icon: ClipboardCheck },
  { href: '/teacher/reports',    label: 'Reports',          icon: BarChart2 },
  { href: '/teacher/fees',       label: 'Fee management',   icon: CreditCard },
  { href: '/teacher/masters',    label: 'Masters',          icon: Settings },
]

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLogin = pathname === '/teacher/login'

  useEffect(() => {
    if (!isLogin) {
      const token = localStorage.getItem('teacher_token')
      if (!token) router.push('/teacher/login')
    }
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('teacher_token')
    localStorage.removeItem('teacher')
    router.push('/teacher/login')
  }

  if (isLogin) return <>{children}</>

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🇫🇷</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">FrenchTuition</p>
              <p className="text-xs text-gray-500">Teacher portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-4 border-t border-gray-200">
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-600 transition-colors">
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
