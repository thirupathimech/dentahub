import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { bookPatientAppointment, getPatientPortalAppointments, getPatientPortalDoctors } from '../api'
import { PortalAppointment, PortalDoctor } from '../types'
import { EmptyState, Screen, ScreenTitle } from '../components/Screen'
import { readSession } from '../storage'

function dateKey(date = new Date()) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return adjusted.toISOString().slice(0, 10)
}

function plusMinutes(value: string, minutes: number) {
  const [hours, mins] = value.split(':').map(Number)
  const total = hours * 60 + mins + minutes
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function PatientPortalScreen({ clinicName }: { clinicName: string }) {
  const [doctors, setDoctors] = useState<PortalDoctor[]>([])
  const [appointments, setAppointments] = useState<PortalAppointment[]>([])
  const [doctorId, setDoctorId] = useState<number | null>(null)
  const [date, setDate] = useState(dateKey(new Date(Date.now() + 86400000)))
  const [time, setTime] = useState('09:00')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const session = await readSession()
      if (!session) return
      const [doctorData, appointmentData] = await Promise.all([getPatientPortalDoctors(session.token), getPatientPortalAppointments(session.token)])
      setDoctors(doctorData); setAppointments(appointmentData); setDoctorId((current) => current ?? doctorData[0]?.id ?? null); setError('')
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load your patient portal.') }
    finally { setLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  async function book() {
    if (!doctorId || !date || !time) { setError('Choose a doctor, date, and time.'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const session = await readSession()
      if (!session) return
      const saved = await bookPatientAppointment(session.token, { doctorId, appointmentDateTime: `${date}T${time}:00`, appointmentEndDateTime: `${date}T${plusMinutes(time, 30)}:00`, appointmentType: 'Consultation', notes })
      setAppointments((current) => [...current, saved].sort((a, b) => a.appointmentDateTime.localeCompare(b.appointmentDateTime))); setNotes(''); setMessage('Appointment booked successfully.')
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to book appointment.') }
    finally { setSaving(false) }
  }

  return <Screen>
    <ScreenTitle eyebrow="Patient portal" title="Book a visit" subtitle={`${clinicName} · Choose your doctor and preferred time.`} />
    <View style={styles.bookingCard}><Text style={styles.cardTitle}>Choose a doctor</Text><View style={styles.doctorList}>{doctors.map((doctor) => <TouchableOpacity key={doctor.id} onPress={() => setDoctorId(doctor.id)} style={[styles.doctor, doctorId === doctor.id && styles.doctorSelected]}><Text style={[styles.doctorName, doctorId === doctor.id && styles.doctorNameSelected]}>{doctor.fullName}</Text><Text style={styles.doctorSpeciality}>{doctor.specialization}</Text></TouchableOpacity>)}</View>{doctors.length === 0 && !loading ? <EmptyState message="No active doctors are available." /> : null}<Text style={styles.label}>Date (YYYY-MM-DD)</Text><TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2026-10-04" placeholderTextColor="#9aaab2" /><Text style={styles.label}>Time (24-hour)</Text><TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="09:00" placeholderTextColor="#9aaab2" /><Text style={styles.label}>Notes</Text><TextInput style={[styles.input, styles.notes]} value={notes} onChangeText={setNotes} multiline placeholder="Anything the clinic should know?" placeholderTextColor="#9aaab2" />{error ? <Text style={styles.error}>{error}</Text> : null}{message ? <Text style={styles.success}>{message}</Text> : null}<TouchableOpacity disabled={saving || loading || !doctorId} onPress={book} style={styles.button}><Text style={styles.buttonText}>{saving ? 'Booking...' : 'Book appointment'}</Text></TouchableOpacity></View>
    <Text style={styles.sectionTitle}>Your appointments</Text>{loading ? <ActivityIndicator size="large" color="#087f8c" /> : appointments.length === 0 ? <EmptyState message="No appointments yet." /> : appointments.map((appointment) => <View key={appointment.id} style={styles.appointment}><Text style={styles.appointmentDate}>{new Date(appointment.appointmentDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text><Text style={styles.appointmentDoctor}>{appointment.doctorName}</Text><Text style={styles.appointmentDetail}>{appointment.specialization} · {appointment.appointmentType}</Text><Text style={styles.status}>{appointment.status.replace('_', ' ').toLowerCase()}</Text></View>)}
  </Screen>
}

const styles = StyleSheet.create({
  bookingCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#e4eeee', marginBottom: 26 },
  cardTitle: { color: '#17323d', fontSize: 17, fontWeight: '800', marginBottom: 12 },
  doctorList: { gap: 8, marginBottom: 10 },
  doctor: { borderWidth: 1, borderColor: '#dce9e9', borderRadius: 13, padding: 12 },
  doctorSelected: { borderColor: '#087f8c', backgroundColor: '#e8f7f5' },
  doctorName: { color: '#17323d', fontSize: 13, fontWeight: '800' },
  doctorNameSelected: { color: '#087f8c' },
  doctorSpeciality: { color: '#71838e', fontSize: 11, marginTop: 4 },
  label: { color: '#47606b', fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: { height: 48, borderWidth: 1, borderColor: '#d8e5e6', borderRadius: 12, paddingHorizontal: 13, color: '#17323d', backgroundColor: '#fbfdfd' },
  notes: { height: 76, paddingTop: 12, textAlignVertical: 'top' },
  error: { color: '#c34b57', fontSize: 12, marginTop: 12 },
  success: { color: '#16805f', fontSize: 12, marginTop: 12 },
  button: { height: 50, borderRadius: 13, backgroundColor: '#087f8c', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  sectionTitle: { color: '#17323d', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  appointment: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e4eeee', padding: 15, marginBottom: 10 },
  appointmentDate: { color: '#087f8c', fontSize: 12, fontWeight: '800' },
  appointmentDoctor: { color: '#17323d', fontSize: 15, fontWeight: '800', marginTop: 8 },
  appointmentDetail: { color: '#71838e', fontSize: 11, marginTop: 4 },
  status: { color: '#087f8c', fontSize: 10, fontWeight: '800', marginTop: 10, textTransform: 'capitalize' },
})
