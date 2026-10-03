import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getAdminOverview } from '../api'
import { AdminOverview, AuthUser } from '../types'
import { EmptyState, Screen, ScreenTitle } from '../components/Screen'
import { readSession } from '../storage'

export default function AdminScreen({ user }: { user: AuthUser }) {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    try { const session = await readSession(); if (!session) return; setOverview(await getAdminOverview(session.token)); setError('') }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not load admin overview.') }
    finally { setLoading(false) }
  }, [])
  useFocusEffect(useCallback(() => { void load() }, [load]))
  return <Screen><ScreenTitle eyebrow={user.clinicName} title="Admin center" subtitle="A quick mobile view of your clinic operations." />{loading && !overview ? <ActivityIndicator size="large" color="#087f8c" /> : error ? <EmptyState message={error} /> : overview ? <><View style={styles.grid}><Metric label="Doctors" value={overview.doctors} /><Metric label="Branches" value={overview.branches} /><Metric label="Team users" value={overview.users} /><Metric label="Treatments" value={overview.treatments} /><Metric label="Invoices" value={overview.invoices} /><Metric label="Payments" value={overview.payments} /></View><View style={styles.card}><Text style={styles.cardTitle}>Admin tools available</Text><Text style={styles.muted}>Use Patients and Appointments tabs for front-desk work. This center keeps your key staff, branch, treatment, billing, and payment counts visible on mobile.</Text></View></> : null}</Screen>
}

function Metric({ label, value }: { label: string; value: number }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value.toLocaleString()}</Text><Text style={styles.metricLabel}>{label}</Text></View> }

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { width: '47%', minHeight: 88, borderRadius: 17, padding: 15, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4eeee' },
  metricValue: { color: '#17323d', fontSize: 24, fontWeight: '800' },
  metricLabel: { color: '#71838e', fontSize: 12, fontWeight: '600', marginTop: 7 },
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 17, borderWidth: 1, borderColor: '#e4eeee', marginTop: 22 },
  cardTitle: { color: '#17323d', fontSize: 16, fontWeight: '800' },
  muted: { color: '#71838e', fontSize: 13, lineHeight: 20, marginTop: 8 },
})
