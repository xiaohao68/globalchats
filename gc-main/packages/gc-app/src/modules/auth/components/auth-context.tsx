"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface AuthContextValue {
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  return (
    <AuthContext.Provider value={{ isLoading, setLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

export { AuthContext, AuthProvider, useAuth }
