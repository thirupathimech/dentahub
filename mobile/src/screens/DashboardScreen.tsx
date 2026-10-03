import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getDashboard } from '../api'
import { AuthUser, DashboardSummary } from '../types'
import { EmptyState, Screen } from '../components/Screen'
import DateTimeField from '../components/DateTimeField'
import { readSession } from '../storage'

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function DashboardScreen({ user }: { user: AuthUser }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [dashboardDate, setDashboardDate] = useState(localDateKey)

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true)
    try {
      const session = await readSession()
      if (!session) return
      setSummary(await getDashboard(session.token, dashboardDate))
      setError('')
    }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not load dashboard.') }
    finally { setLoading(false); setRefreshing(false) }
  }, [dashboardDate])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  return <Screen scroll refreshing={refreshing} onRefresh={() => { void load(true) }}>
    <View style={styles.hero}>
      <View style={styles.heroTop}><View style={styles.avatar}><Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.heroCopy}><Text style={styles.heroEyebrow}>Good day, {user.name.split(' ')[0]}</Text><Text style={styles.heroTitle}>Your clinic at a glance</Text><Text style={styles.heroClinic}>{user.clinicName || 'DentaHub'}</Text></View><View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View></View>
      <View style={styles.dateFilter}><Text style={styles.dateFilterLabel}>Dashboard date</Text><DateTimeField value={dashboardDate} onChange={setDashboardDate} placeholder="Choose date" /></View>
      <TouchableOpacity style={styles.refreshButton} onPress={() => { void load(true) }} disabled={refreshing}><Text style={styles.refreshText}>{refreshing ? 'Refreshing…' : '↻  Refresh overview'}</Text></TouchableOpacity>
    </View>
    <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Today at a glance</Text><Text style={styles.sectionSubtitle}>A quick view of your clinic activity</Text></View><Text style={styles.sectionHint}>Updated now</Text></View>
    {loading && !summary ? <ActivityIndicator size="large" color="#087f8c" /> : error ? <EmptyState message={error} /> : summary ? <>
      <View style={styles.grid}>
        <View style={styles.gridRow}><Metric icon="♙" label="Patients" value={summary.totalPatients.toLocaleString()} color="#e4f5f2" /><Metric icon="▣" label="Appointments" value={String(summary.todayAppointments)} color="#eaf1ff" /></View>
        <View style={styles.gridRow}><Metric icon="⚕" label="Doctors" value={String(summary.totalDoctors)} color="#f2ebff" /><Metric icon="₹" label="Outstanding" value={money(summary.totalOutstanding)} color="#fff2e6" /></View>
      </View>
      <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Appointments on selected date</Text><Text style={styles.sectionSubtitle}>Your patient visits for {new Date(`${summary.date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text></View><Text style={styles.sectionHint}>{summary.appointments.length} scheduled</Text></View>
      <View style={styles.card}>
        {summary.appointments.length === 0 ? <Text style={styles.muted}>No appointments scheduled for today.</Text> : summary.appointments.map((appointment) => <View key={`${appointment.appointmentDateTime}-${appointment.patient}`} style={styles.appointment}><View style={styles.timePill}><Text style={styles.time}>{new Date(appointment.appointmentDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View><View style={styles.appointmentBody}><Text style={styles.patient}>{appointment.patient}</Text><Text style={styles.muted}>{appointment.appointmentType} · {appointment.doctor}</Text></View><Text style={styles.status}>{appointment.status.replace('_', ' ')}</Text></View>)}
      </View>
      <View style={styles.financeCard}><View style={styles.financeHeader}><View><Text style={styles.sectionTitle}>Financial snapshot</Text><Text style={styles.sectionSubtitle}>This clinic's billing overview</Text></View><Text style={styles.financeIcon}>₹</Text></View><View style={styles.finance}><Finance label="Billed" value={money(summary.totalBilled)} /><Finance label="Collected" value={money(summary.totalCollected)} /></View></View>
    </> : null}
  </Screen>
}

function Metric({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) { return <View style={[styles.metric, { backgroundColor: color }]}><View style={styles.metricTop}><Text style={styles.metricIcon}>{icon}</Text><Text style={styles.metricArrow}>↗</Text></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View> }
function Finance({ label, value }: { label: string; value: string }) { return <View style={styles.financeItem}><Text style={styles.muted}>{label}</Text><Text style={styles.financeValue}>{value}</Text></View> }

const styles = StyleSheet.create({
  hero: { backgroundColor: '#087f8c', borderRadius: 24, padding: 18, marginBottom: 24, shadowColor: '#087f8c', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 21, fontWeight: '800' },
  heroCopy: { flex: 1, marginLeft: 12 },
  heroEyebrow: { color: '#c8f0eb', fontSize: 11, fontWeight: '700' },
  heroTitle: { color: '#ffffff', fontSize: 19, fontWeight: '800', marginTop: 3 },
  heroClinic: { color: '#d9f5f2', fontSize: 12, marginTop: 4 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.14)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9af0c4', marginRight: 5 },
  liveText: { color: '#ffffff', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  refreshButton: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, marginTop: 16 },
  refreshText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  dateFilter: { marginTop: 17 },
  dateFilterLabel: { color: '#c8f0eb', fontSize: 10, fontWeight: '800', marginBottom: 5 },
  grid: { gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  metric: { flex: 1, minHeight: 116, borderRadius: 18, padding: 15, justifyContent: 'space-between' },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricIcon: { color: '#087f8c', fontSize: 17, fontWeight: '800' },
  metricArrow: { color: '#71838e', fontSize: 16, fontWeight: '800' },
  metricValue: { color: '#17323d', fontSize: 22, fontWeight: '800', marginTop: 12 },
  metricLabel: { color: '#71838e', fontSize: 12, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 },
  sectionTitle: { color: '#17323d', fontSize: 17, fontWeight: '800' },
  sectionSubtitle: { color: '#8a98a7', fontSize: 11, marginTop: 4 },
  sectionHint: { color: '#087f8c', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#e4eeee' },
  appointment: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#edf3f3' },
  timePill: { width: 67, borderRadius: 10, backgroundColor: '#e8f7f5', paddingVertical: 8, alignItems: 'center', marginRight: 11 },
  time: { color: '#087f8c', fontSize: 11, fontWeight: '800' },
  appointmentBody: { flex: 1 },
  patient: { color: '#17323d', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  status: { color: '#087f8c', fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  muted: { color: '#71838e', fontSize: 12 },
  financeCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#e4eeee', marginTop: 14, marginBottom: 10 },
  financeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  financeIcon: { color: '#087f8c', backgroundColor: '#e8f7f5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 16, fontWeight: '800' },
  finance: { flexDirection: 'row', gap: 12, marginTop: 14 },
  financeItem: { flex: 1, backgroundColor: '#f7fbfb', borderRadius: 14, padding: 14 },
  financeValue: { color: '#17323d', fontSize: 18, fontWeight: '800', marginTop: 7 },
})
