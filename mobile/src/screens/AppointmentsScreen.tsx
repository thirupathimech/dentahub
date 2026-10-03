import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getAppointments } from '../api'
import { Appointment } from '../types'
import { EmptyState, Screen, ScreenTitle } from '../components/Screen'
import { readSession } from '../storage'

export default function AppointmentsScreen({ clinicName }: { clinicName: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const session = await readSession(); if (!session) return; setAppointments(await getAppointments(session.token)); setError('') }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not load appointments.') }
    finally { setLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  return <Screen>
    <ScreenTitle title="Appointments" subtitle={`${clinicName} · Today's clinic schedule.`} />
    {loading ? <ActivityIndicator size="large" color="#087f8c" /> : error ? <EmptyState message={error} /> : appointments.length === 0 ? <EmptyState message="No appointments scheduled for today." /> : appointments.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} />)}
  </Screen>
}

function AppointmentCard({ appointment }: { appointment: Appointment }) { return <View style={styles.card}><Text style={styles.time}>{new Date(appointment.appointmentDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text><View style={styles.body}><Text style={styles.patient}>{appointment.patientName}</Text><Text style={styles.detail}>{appointment.appointmentType} · Dr. {appointment.doctorName}</Text></View><Text style={styles.status}>{appointment.status.replace('_', ' ').toLowerCase()}</Text></View> }

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4eeee', borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  time: { width: 67, color: '#087f8c', fontSize: 13, fontWeight: '800' },
  body: { flex: 1 },
  patient: { color: '#17323d', fontSize: 14, fontWeight: '800' },
  detail: { color: '#71838e', fontSize: 11, marginTop: 5 },
  status: { color: '#087f8c', fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
})
