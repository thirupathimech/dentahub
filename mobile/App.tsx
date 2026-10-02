import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Navigation from './src/navigation'
import { clearSession, readSession, saveSession } from './src/storage'
import { AuthUser } from './src/types'

export default function App() {
  const [session, setSession] = useState<{ token: string; user: AuthUser } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    readSession().then(setSession).finally(() => setLoading(false))
  }, [])

  const handleLogin = async (token: string, user: AuthUser) => {
    await saveSession(token, user)
    setSession({ token, user })
  }

  const handleLogout = async () => {
    await clearSession()
    setSession(null)
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Navigation session={session} loading={loading} onLogin={handleLogin} onLogout={handleLogout} />
    </SafeAreaProvider>
  )
}
