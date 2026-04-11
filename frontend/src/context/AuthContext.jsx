import { createContext, useContext, useState, useCallback } from 'react'
import { saveToken, removeToken } from '../services/api'

const AuthContext = createContext(null)
const STORAGE_KEY = 'docmind_user'

function loadUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser)

  const login = useCallback((userData) => {
    // userData must include: { name, email, token? }
    const u = {
      name:   userData.name  || userData.email.split('@')[0],
      email:  userData.email,
      avatar: userData.avatar || null,
      plan:   userData.plan   || 'Free',
      joined: userData.joined || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    }
    setUser(u)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    // Save JWT token if provided (comes from real backend login)
    if (userData.token) {
      saveToken(userData.token)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    removeToken()   // clear JWT so next request won't send old token
  }, [])

  const isGuest     = user === null
  const isLoggedIn  = !isGuest
  const displayName = user?.name || 'Guest'

  return (
    <AuthContext.Provider value={{
      user,
      isGuest,
      isLoggedIn,
      displayName,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
