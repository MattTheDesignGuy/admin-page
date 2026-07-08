import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'

interface AuthContextValue {
  status: 'loading' | 'authenticated' | 'unauthenticated'
  username: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<{ username: string }>('/api/auth/me')
      .then((data) => {
        setUsername(data.username)
        setStatus('authenticated')
      })
      .catch(() => setStatus('unauthenticated'))
  }, [])

  const login = async (usernameInput: string, password: string) => {
    const data = await api.post<{ username: string }>('/api/auth/login', {
      username: usernameInput,
      password,
    })
    setUsername(data.username)
    setStatus('authenticated')
  }

  const logout = async () => {
    await api.post('/api/auth/logout')
    setUsername(null)
    setStatus('unauthenticated')
  }

  return <AuthContext.Provider value={{ status, username, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
