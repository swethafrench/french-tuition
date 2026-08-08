'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Image from 'next/image'
import { CalendarDays, CalendarOff, CreditCard, User } from 'lucide-react'

const navItems = [
  { href: '/student/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/student/leave',    label: 'Leave',    icon: CalendarOff },
  { href: '/student/fees',     label: 'Fees',     icon: CreditCard },
  { href: '/student/profile',  label: 'Profile',  icon: User },
]

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLogin = pathname === '/student/login'

  useEffect(() => {
    if (!isLogin) {
      const token = localStorage.getItem('student_token')
      if (!token) router.push('/student/login')
    }
  }, [pathname])

  if (isLogin) return <>{children}</>

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-md bg-white flex flex-col min-h-screen shadow-sm">
        <header className="bg-[#0f2044] px-4 py-3 flex items-center gap-3">
          <Image src="/apprenons.png" alt="Apprenons" width={36} height={36} className="rounded-lg" />
          <div>
            <p className="text-sm font-semibold text-white">Apprenons</p>
            <p className="text-xs text-blue-300">French Tuition</p>
          </div>
        </header>
        <main className="flex-1 overflow-auto pb-20">
          {children}
        </main>
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 flex">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <a key={href} href={href} className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs transition-colors ${
                active ? 'text-[#0f2044]' : 'text-gray-400 hover:text-gray-600'
              }`}>
                <Icon size={20} />
                {label}
              </a>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
