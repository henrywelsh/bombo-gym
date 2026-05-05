import { createAuthClient } from 'better-auth/react'
import { createContext, useContext, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { getProfile } from './lib/programQueries'
import NavBar from './components/NavBar'
import Dashboard from './pages/Dashboard'
import LogSession from './pages/LogSession'
import Progress from './pages/Progress'
import Nutrition from './pages/Nutrition'
import Settings from './pages/Settings'

export const authClient = createAuthClient({ baseURL: window.location.origin })

// ── Auth Context ──────────────────────────────────────────────────────────────

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }) {
  const { data: session, isPending } = authClient.useSession()
  const user = session?.user ?? null

  const [profile, setProfile]             = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  async function loadProfile() {
    try {
      const p = await getProfile()
      setProfile(p)
    } catch {
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  async function refreshProfile() {
    await loadProfile()
  }

  useEffect(() => {
    if (isPending) return
    if (user) {
      loadProfile()
    } else {
      setProfile(null)
      setProfileLoading(false)
    }
  }, [user?.id, isPending])

  const loading = isPending || (!!user && profileLoading)

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Auth Guard ────────────────────────────────────────────────────────────────

function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  // First-time user: redirect to Settings to complete profile
  if (!profile?.program_start_date && location.pathname !== '/settings') {
    return <Navigate to="/settings" replace />
  }

  return children
}

// ── Login Page ────────────────────────────────────────────────────────────────

function LoginPage() {
  const [loading, setLoading] = useState(false)

  async function signInWithGoogle() {
    setLoading(true)
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: window.location.origin,
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🏋️</div>
        <h1 className="text-4xl font-bold text-amber-500 mb-2">Bombo Gym</h1>
      </div>
      <button
        onClick={signInWithGoogle}
        disabled={loading}
        className="btn-primary flex items-center gap-3 text-base px-6 py-3"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {loading ? 'Redirecting…' : 'Sign in with Google'}
      </button>
    </div>
  )
}

// ── App Shell ─────────────────────────────────────────────────────────────────

function AppShell() {
  return (
    <RequireAuth>
      <div className="flex flex-col min-h-screen pb-16 md:pb-0 md:pt-16">
        <NavBar />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/log"       element={<LogSession />} />
            <Route path="/progress"  element={<Progress />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/settings"  element={<Settings />} />
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}
