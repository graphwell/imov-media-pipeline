'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Upload, Building2, Settings, LogOut } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) router.push('/login')
  }, [router])

  function handleLogout() {
    const refreshToken = localStorage.getItem('refresh_token') || ''
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    localStorage.clear()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-blue-600">IMOV Admin</h1>
          <p className="text-xs text-gray-500 mt-1">Somar IA</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" />
          <NavLink href="/dashboard/importacoes" icon={<Upload size={18} />} label="Importações" />
          <NavLink href="/dashboard/empreendimentos" icon={<Building2 size={18} />} label="Empreendimentos" />
          <NavLink href="/dashboard/configuracoes" icon={<Settings size={18} />} label="Configurações" />
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full text-sm text-gray-600 hover:text-red-600 p-2 rounded hover:bg-red-50"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-700"
    >
      {icon}
      {label}
    </Link>
  )
}
