import { NavLink } from 'react-router-dom'
import { authClient } from '../App'

const links = [
  { to: '/',      label: 'Today', icon: BoltIcon },
  { to: '/board', label: 'Board', icon: ChartIcon },
]

function signOut() {
  authClient.signOut()
}

export default function NavBar() {
  return (
    <>
      {/* Desktop top bar */}
      <nav className="hidden md:flex fixed top-0 inset-x-0 z-50 bg-slate-900 border-b border-slate-800 h-16 items-center px-6 gap-6">
        <span className="text-amber-500 font-bold text-xl mr-4">🏋️ Bombo</span>
        {links.map(({ to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `text-sm font-medium transition-colors px-3 py-1 rounded-md ${
                isActive
                  ? 'text-amber-500 bg-slate-800'
                  : 'text-slate-400 hover:text-slate-100'
              }`
            }
          >
            {links.find(l => l.to === to).label}
          </NavLink>
        ))}
        <button
          onClick={signOut}
          className="ml-auto text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors"
        >
          Sign out
        </button>
      </nav>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-slate-900 border-t border-slate-800 flex">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
            <div className="pt-2 pb-1"><Icon className="w-5 h-5" /></div>
            <span className="pb-1">{label}</span>
          </NavLink>
        ))}
        <button onClick={signOut} className={`${baseLink} text-slate-400 hover:text-slate-200`}>
          <div className="pt-2 pb-1"><LogoutIcon className="w-5 h-5" /></div>
          <span className="pb-1">Sign out</span>
        </button>
      </nav>
    </>
  )
}

const baseLink = 'flex-1 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors'

function linkClass({ isActive }) {
  return `${baseLink} ${isActive ? 'text-amber-500' : 'text-slate-400 hover:text-slate-200'}`
}

function BoltIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}

function ChartIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V9m4 10V5m4 14v-6M5 19h14" />
    </svg>
  )
}

function LogoutIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}
