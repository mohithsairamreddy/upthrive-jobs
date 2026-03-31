import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LayoutDashboard, FileText, Building2, Settings, LogOut, Briefcase } from 'lucide-react'

const links = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/resume',    label: 'Resume',      icon: FileText },
  { to: '/companies', label: 'Companies',   icon: Building2 },
  { to: '/settings',  label: 'Settings',    icon: Settings },
]

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-brand-900 text-white flex flex-col z-10">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-brand-800">
        <Briefcase className="w-6 h-6 text-brand-300" />
        <span className="font-bold text-lg">Upthrive Jobs</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive
                ? 'bg-brand-700 text-white'
                : 'text-brand-200 hover:bg-brand-800 hover:text-white'}`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-brand-800">
        <p className="text-xs text-brand-400 px-3 mb-2 truncate">{user?.email}</p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm
                     text-brand-200 hover:bg-brand-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
