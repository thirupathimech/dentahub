import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { AppState } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Navigation from './src/navigation'
import { clearSession, readApiBaseUrl, readSession, saveSession } from './src/storage'
import { AuthUser } from './src/types'
import { configureApiBaseUrl, getClinicSettings } from './src/api'

export default function App() {
  const [session, setSession] = useState<{ token: string; user: AuthUser } | null>(null)
  const [loading, setLoading] = useState(true)
  const [clinicName, setClinicName] = useState('DentaHub')
  const [clinicLogo, setClinicLogo] = useState('')

  useEffect(() => {
    readApiBaseUrl().then((apiBaseUrl) => {
      configureApiBaseUrl(apiBaseUrl)
      return Promise.all([readSession(), getClinicSettings().catch(() => null)])
    }).then(([storedSession, settings]) => {
      const resolvedClinicName = settings?.clinicName?.trim() || storedSession?.user.clinicName || 'DentaHub'
      setClinicName(resolvedClinicName)
      setClinicLogo(settings?.logoDataUrl ?? '')
      setSession(storedSession ? { ...storedSession, user: { ...storedSession.user, clinicName: resolvedClinicName } } : null)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      getClinicSettings().then((settings) => {
        const nextName = settings.clinicName?.trim()
        if (!nextName) return
        setClinicName(nextName)
        setClinicLogo(settings.logoDataUrl ?? '')
        setSession((current) => current ? { ...current, user: { ...current.user, clinicName: nextName } } : current)
      }).catch(() => undefined)
    })
    return () => subscription.remove()
  }, [])

  const handleLogin = async (token: string, user: AuthUser) => {
    const nextUser = { ...user, clinicName: clinicName || user.clinicName || 'DentaHub' }
    await saveSession(token, nextUser)
    setSession({ token, user: nextUser })
  }

  const handleLogout = async () => {
    await clearSession()
    setSession(null)
  }

  const handleSettingsSaved = async (settings: Awaited<ReturnType<typeof getClinicSettings>>) => {
    const nextClinicName = settings.clinicName?.trim() || 'DentaHub'
    setClinicName(nextClinicName)
    setClinicLogo(settings.logoDataUrl ?? '')
    setSession((current) => current ? { ...current, user: { ...current.user, clinicName: nextClinicName } } : current)
    const current = await readSession()
    if (current) await saveSession(current.token, { ...current.user, clinicName: nextClinicName })
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
    <Navigation session={session} loading={loading} clinicName={clinicName} clinicLogo={clinicLogo} onLogin={handleLogin} onLogout={handleLogout} onSettingsSaved={handleSettingsSaved} />
    </SafeAreaProvider>
  )
}
