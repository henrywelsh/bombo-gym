import { NavLink } from 'react-router-dom'

const links = [
  { to: '/',          label: 'Today',    icon: HomeIcon },
  { to: '/log',       label: 'Log',      icon: PencilIcon },
  { to: '/progress',  label: 'Progress', icon: ChartIcon },
  { to: '/nutrition', label: 'Nutrition',icon: FoodIcon },
  { to: '/settings',  label: 'Settings', icon: GearIcon },
]

function linkClass({ isActive }) {
  return `flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
    isActive ? 'text-amber-500' : 'text-slate-400 hover:text-slate-200'
  }`
}

export default function NavBar() {
  return (
    <>
      {/* Desktop top bar */}
      <nav className="hidden md:flex fixed top-0 inset-x-0 z-50 bg-slate-900 border-b border-slate-800 h-16 items-center px-6 gap-6">
        <span className="text-amber-500 font-bold text-xl mr-4">🏋️ Bombo</span>
        {links.map(({ to, label }) => (
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
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-slate-900 border-t border-slate-800 flex">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={linkClass}
          >
            <div className="pt-2 pb-1">
              <Icon className="w-5 h-5" />
            </div>
            <span className="pb-1">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}

function HomeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H15v-6H9v6H3V9.75z" />
    </svg>
  )
}

function PencilIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2.121 2.121 0 113 3L12 16H9v-3z" />
    </svg>
  )
}

function ChartIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l4-8 4 6 2-3 3 5H2" />
    </svg>
  )
}

function FoodIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function GearIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
