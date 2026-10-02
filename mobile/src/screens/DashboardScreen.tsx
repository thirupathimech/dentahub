import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getDashboard } from '../api'
import { AuthUser, DashboardSummary } from '../types'
import { EmptyState, Screen, ScreenTitle } from '../components/Screen'
import { readSession } from '../storage'

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}

export default function DashboardScreen({ user }: { user: AuthUser }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true)
    try {
      const session = await readSession()
      if (!session) return
      setSummary(await getDashboard(session.token))
      setError('')
    }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not load dashboard.') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  return <Screen scroll>
    <ScreenTitle eyebrow={`Good day, ${user.name.split(' ')[0]}`} title="Dashboard" subtitle={user.clinicName || 'Your clinic overview'} />
    {loading && !summary ? <ActivityIndicator size="large" color="#087f8c" /> : error ? <EmptyState message={error} /> : summary ? <>
      <View style={styles.grid}>
        <Metric label="Patients" value={summary.totalPatients.toLocaleString()} color="#e4f5f2" />
        <Metric label="Today appointments" value={String(summary.todayAppointments)} color="#eaf1ff" />
        <Metric label="Doctors" value={String(summary.totalDoctors)} color="#f2ebff" />
        <Metric label="Outstanding" value={money(summary.totalOutstanding)} color="#fff2e6" />
      </View>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Today's appointments</Text><Text style={styles.sectionHint}>{summary.appointments.length} scheduled</Text></View>
      <View style={styles.card}>
        {summary.appointments.length === 0 ? <Text style={styles.muted}>No appointments scheduled for today.</Text> : summary.appointments.map((appointment) => <View key={`${appointment.appointmentDateTime}-${appointment.patient}`} style={styles.appointment}><Text style={styles.time}>{new Date(appointment.appointmentDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text><View style={styles.appointmentBody}><Text style={styles.patient}>{appointment.patient}</Text><Text style={styles.muted}>{appointment.appointmentType} · {appointment.doctor}</Text></View><Text style={styles.status}>{appointment.status.replace('_', ' ')}</Text></View>)}
      </View>
      <View style={styles.finance}><Finance label="Billed" value={money(summary.totalBilled)} /><Finance label="Collected" value={money(summary.totalCollected)} /></View>
    </> : null}
  </Screen>
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) { return <View style={[styles.metric, { backgroundColor: color }]}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View> }
function Finance({ label, value }: { label: string; value: string }) { return <View style={styles.financeItem}><Text style={styles.muted}>{label}</Text><Text style={styles.financeValue}>{value}</Text></View> }

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { width: '47%', minHeight: 92, borderRadius: 18, padding: 15, justifyContent: 'space-between' },
  metricValue: { color: '#17323d', fontSize: 22, fontWeight: '800' },
  metricLabel: { color: '#71838e', fontSize: 12, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 },
  sectionTitle: { color: '#17323d', fontSize: 17, fontWeight: '800' },
  sectionHint: { color: '#087f8c', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#e4eeee' },
  appointment: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#edf3f3' },
  time: { width: 64, color: '#17323d', fontSize: 12, fontWeight: '800' },
  appointmentBody: { flex: 1 },
  patient: { color: '#17323d', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  status: { color: '#087f8c', fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  muted: { color: '#71838e', fontSize: 12 },
  finance: { flexDirection: 'row', gap: 12, marginTop: 14 },
  financeItem: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e4eeee' },
  financeValue: { color: '#17323d', fontSize: 18, fontWeight: '800', marginTop: 7 },
})
