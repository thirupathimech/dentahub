import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { appointmentConflict, checkInAppointment, createAppointment, deleteAppointment, getAppointments, getDoctors, getPatients, updateAppointment, AppointmentPayload } from '../api'
import { Appointment, Doctor, Patient } from '../types'
import { EmptyState, Screen, ScreenTitle } from '../components/Screen'
import DateTimeField from '../components/DateTimeField'
import { readSession } from '../storage'

type AppointmentForm = { patientId: string; doctorId: string; date: string; startTime: string; endTime: string; appointmentType: string; status: string; notes: string; walkIn: boolean }
const appointmentTypes = ['Consultation', 'New patient consultation', 'Follow-up', 'Cleaning', 'Filling', 'Root canal', 'Extraction', 'Crown / Bridge', 'Orthodontic', 'Emergency', 'Other']
const statuses = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']

function dateKey(date = new Date()) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return adjusted.toISOString().slice(0, 10)
}

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(':').map(Number)
  const total = hours * 60 + mins + minutes
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function minutes(time: string) {
  const [hours, mins] = time.split(':').map(Number)
  return hours * 60 + mins
}

function emptyForm(date = dateKey()): AppointmentForm {
  return { patientId: '', doctorId: '', date, startTime: '09:00', endTime: '09:30', appointmentType: 'Consultation', status: 'SCHEDULED', notes: '', walkIn: false }
}

function fromAppointment(appointment: Appointment): AppointmentForm {
  const start = appointment.appointmentDateTime.slice(11, 16)
  const end = appointment.appointmentEndDateTime?.slice(11, 16) || addMinutes(start, 30)
  return { patientId: String(appointment.patientId), doctorId: String(appointment.doctorId), date: appointment.appointmentDateTime.slice(0, 10), startTime: start, endTime: end, appointmentType: appointment.appointmentType, status: appointment.status, notes: appointment.notes ?? '', walkIn: appointment.walkIn }
}

export default function AppointmentsScreen({ clinicName }: { clinicName: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDate, setSelectedDate] = useState(dateKey())
  const [patientSearch, setPatientSearch] = useState('')
  const [form, setForm] = useState<AppointmentForm>(emptyForm())
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflictSlots, setConflictSlots] = useState<{ startTime: string; endTime: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const session = await readSession(); if (!session) return
      const [appointmentData, patientData, doctorData] = await Promise.all([getAppointments(session.token, selectedDate), getPatients(session.token), getDoctors(session.token)])
      setAppointments(appointmentData); setPatients(patientData); setDoctors(doctorData); setError('')
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not load appointments.') }
    finally { setLoading(false) }
  }, [selectedDate])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  const patientMatches = useMemo(() => {
    const query = patientSearch.trim().toLowerCase()
    if (!query) return patients.slice(0, 8)
    return patients.filter((patient) => `${patient.fullName} ${patient.phone} ${patient.email ?? ''}`.toLowerCase().includes(query)).slice(0, 8)
  }, [patientSearch, patients])

  const openCreate = () => { setEditing(null); setForm(emptyForm(selectedDate)); setPatientSearch(''); setConflictSlots([]); setError(''); setFormOpen(true) }
  const openEdit = (appointment: Appointment) => { setEditing(appointment); setForm(fromAppointment(appointment)); setPatientSearch(appointment.patientName); setConflictSlots([]); setError(''); setFormOpen(true) }
  const closeForm = () => { setEditing(null); setFormOpen(false); setPatientSearch(''); setConflictSlots([]); setForm(emptyForm(selectedDate)); setError('') }

  async function save() {
    if (!form.patientId || !form.doctorId) { setError('Select a patient and doctor.'); return }
    if (!form.date || !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) { setError('Use date format YYYY-MM-DD.'); return }
    if (!/^\d{2}:\d{2}$/.test(form.startTime) || !/^\d{2}:\d{2}$/.test(form.endTime) || minutes(form.endTime) <= minutes(form.startTime)) { setError('End time must be after start time.'); return }
    setSaving(true); setError(''); setConflictSlots([])
    const payload: AppointmentPayload = { patientId: Number(form.patientId), doctorId: Number(form.doctorId), appointmentDateTime: `${form.date}T${form.startTime}:00`, appointmentEndDateTime: `${form.date}T${form.endTime}:00`, appointmentType: form.appointmentType, status: form.status, notes: form.notes, overrideConflict: false, walkIn: form.walkIn }
    try {
      const session = await readSession(); if (!session) return
      const saved = editing ? await updateAppointment(session.token, editing.id, payload) : await createAppointment(session.token, payload)
      setSelectedDate(saved.appointmentDateTime.slice(0, 10)); closeForm(); await load()
    } catch (requestError) {
      if (appointmentConflict(requestError)) { setError(requestError.payload.message); setConflictSlots(requestError.payload.availableSlots) }
      else setError(requestError instanceof Error ? requestError.message : 'Unable to save appointment.')
    } finally { setSaving(false) }
  }

  function remove(appointment: Appointment) {
    Alert.alert('Delete appointment?', `Delete ${appointment.patientName}'s appointment?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { const session = await readSession(); if (!session) return; await deleteAppointment(session.token, appointment.id); setAppointments((current) => current.filter((item) => item.id !== appointment.id)) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to delete appointment.') } } },
    ])
  }

  async function checkIn(appointment: Appointment) {
    try { const session = await readSession(); if (!session) return; const saved = await checkInAppointment(session.token, appointment.id); setAppointments((current) => current.map((item) => item.id === saved.id ? saved : item)) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to check in appointment.') }
  }

  return <Screen>
    <View style={styles.titleRow}><View style={styles.titleWrap}><ScreenTitle title="Appointments" subtitle={`${clinicName} · Schedule and track clinic visits.`} /></View><TouchableOpacity style={styles.addButton} onPress={openCreate}><Text style={styles.addButtonText}>＋ New</Text></TouchableOpacity></View>
    <View style={styles.dateRow}><View style={styles.datePickerWrap}><DateTimeField label="Appointment date" value={selectedDate} onChange={setSelectedDate} /></View><TouchableOpacity onPress={() => setSelectedDate(dateKey())} style={styles.todayButton}><Text style={styles.todayText}>Today</Text></TouchableOpacity></View>
    {error && !formOpen ? <Text style={styles.errorBanner}>{error}</Text> : null}
    {loading ? <ActivityIndicator size="large" color="#087f8c" /> : appointments.length === 0 ? <EmptyState message="No appointments scheduled for this date." /> : appointments.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} onEdit={() => openEdit(appointment)} onDelete={() => remove(appointment)} onCheckIn={() => checkIn(appointment)} />)}
    <AppointmentModal visible={formOpen} editing={editing} form={form} setForm={setForm} patients={patients} doctors={doctors} patientSearch={patientSearch} setPatientSearch={setPatientSearch} patientMatches={patientMatches} conflictSlots={conflictSlots} saving={saving} error={error} onClose={closeForm} onSave={save} />
  </Screen>
}

function AppointmentCard({ appointment, onEdit, onDelete, onCheckIn }: { appointment: Appointment; onEdit: () => void; onDelete: () => void; onCheckIn: () => void }) {
  return <View style={styles.card}><Text style={styles.time}>{new Date(appointment.appointmentDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text><View style={styles.body}><Text style={styles.patient}>{appointment.patientName}</Text><Text style={styles.detail}>{appointment.appointmentType} · Dr. {appointment.doctorName}</Text><Text style={styles.notes}>{appointment.notes || (appointment.walkIn ? 'Walk-in queue' : 'No notes')}</Text></View><View style={styles.cardActions}><Text style={styles.status}>{appointment.status.replace('_', ' ').toLowerCase()}</Text><View style={styles.actionRow}>{!appointment.checkedInAt && appointment.status !== 'CANCELLED' ? <TouchableOpacity onPress={onCheckIn} style={styles.actionButton}><Text style={styles.checkText}>Check in</Text></TouchableOpacity> : null}<TouchableOpacity onPress={onEdit} style={styles.actionButton}><Text style={styles.editText}>Edit</Text></TouchableOpacity><TouchableOpacity onPress={onDelete} style={styles.actionButton}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity></View>{appointment.checkedInAt ? <Text style={styles.checked}>Checked in</Text> : null}</View></View>
}

function AppointmentModal({ visible, editing, form, setForm, patients, doctors, patientSearch, setPatientSearch, patientMatches, conflictSlots, saving, error, onClose, onSave }: { visible: boolean; editing: Appointment | null; form: AppointmentForm; setForm: (form: AppointmentForm) => void; patients: Patient[]; doctors: Doctor[]; patientSearch: string; setPatientSearch: (value: string) => void; patientMatches: Patient[]; conflictSlots: { startTime: string; endTime: string }[]; saving: boolean; error: string; onClose: () => void; onSave: () => void }) {
  const selectedPatient = patients.find((patient) => String(patient.id) === form.patientId)
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><View style={styles.modalScreen}><View style={styles.modalHeader}><View><Text style={styles.modalTitle}>{editing ? 'Edit appointment' : 'New appointment'}</Text><Text style={styles.modalSubtitle}>Choose patient, doctor, time, and visit details.</Text></View><TouchableOpacity onPress={onClose}><Text style={styles.close}>×</Text></TouchableOpacity></View><ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled"><Text style={styles.label}>Patient *</Text>{selectedPatient ? <View style={styles.selectedPatient}><View style={styles.selectedBody}><Text style={styles.selectedName}>{selectedPatient.fullName}</Text><Text style={styles.selectedDetail}>{selectedPatient.phone}{selectedPatient.email ? ` · ${selectedPatient.email}` : ''}</Text></View><TouchableOpacity onPress={() => { setForm({ ...form, patientId: '' }); setPatientSearch('') }}><Text style={styles.changeText}>Change</Text></TouchableOpacity></View> : <><TextInput style={styles.input} value={patientSearch} onChangeText={setPatientSearch} placeholder="Search patient name, phone, or email" placeholderTextColor="#9aaab2" />{patientMatches.map((patient) => <TouchableOpacity key={patient.id} onPress={() => { setForm({ ...form, patientId: String(patient.id) }); setPatientSearch(patient.fullName) }} style={styles.option}><Text style={styles.optionName}>{patient.fullName}</Text><Text style={styles.optionDetail}>{patient.phone}{patient.email ? ` · ${patient.email}` : ''}</Text></TouchableOpacity>)}</>}<Text style={styles.label}>Doctor *</Text><View style={styles.chips}>{doctors.filter((doctor) => doctor.status === 'ACTIVE').map((doctor) => <TouchableOpacity key={doctor.id} onPress={() => setForm({ ...form, doctorId: String(doctor.id) })} style={[styles.chip, form.doctorId === String(doctor.id) && styles.chipActive]}><Text style={[styles.chipText, form.doctorId === String(doctor.id) && styles.chipTextActive]}>{doctor.fullName}</Text><Text style={styles.chipSubtext}>{doctor.specialization}</Text></TouchableOpacity>)}</View><View style={styles.twoColumns}><DateTimeField label="Appointment date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} /><DateTimeField label="Start time" value={form.startTime} mode="time" onChange={(value) => setForm({ ...form, startTime: value })} /></View><View style={styles.twoColumns}><View style={styles.column}><DateTimeField label="End time" value={form.endTime} mode="time" onChange={(value) => setForm({ ...form, endTime: value })} /></View></View><Text style={styles.label}>Appointment type</Text><View style={styles.chips}>{appointmentTypes.map((type) => <TouchableOpacity key={type} onPress={() => setForm({ ...form, appointmentType: type })} style={[styles.smallChip, form.appointmentType === type && styles.chipActive]}><Text style={[styles.chipText, form.appointmentType === type && styles.chipTextActive]}>{type}</Text></TouchableOpacity>)}</View><Text style={styles.label}>Status</Text><View style={styles.chips}>{statuses.map((status) => <TouchableOpacity key={status} onPress={() => setForm({ ...form, status })} style={[styles.smallChip, form.status === status && styles.chipActive]}><Text style={[styles.chipText, form.status === status && styles.chipTextActive]}>{status.replace('_', ' ')}</Text></TouchableOpacity>)}</View><TouchableOpacity onPress={() => setForm({ ...form, walkIn: !form.walkIn })} style={styles.walkInRow}><View style={[styles.checkbox, form.walkIn && styles.checkboxActive]}>{form.walkIn ? <Text style={styles.checkmark}>✓</Text> : null}</View><Text style={styles.walkInText}>Add to walk-in queue</Text></TouchableOpacity><Field label="Notes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} multiline />{error ? <Text style={styles.formError}>{error}</Text> : null}{conflictSlots.length > 0 ? <View style={styles.conflictBox}><Text style={styles.conflictTitle}>Available slots</Text><Text style={styles.conflictHint}>Choose one of these times and save again.</Text><View style={styles.chips}>{conflictSlots.map((slot) => <TouchableOpacity key={`${slot.startTime}-${slot.endTime}`} onPress={() => setForm({ ...form, startTime: slot.startTime, endTime: slot.endTime })} style={styles.slot}><Text style={styles.slotText}>{slot.startTime} – {slot.endTime}</Text></TouchableOpacity>)}</View></View> : null}</ScrollView><View style={styles.modalFooter}><TouchableOpacity onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={saving} onPress={onSave} style={styles.saveButton}><Text style={styles.saveText}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Create appointment'}</Text></TouchableOpacity></View></View></Modal>
}

function Field({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) { return <View><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChange} style={[styles.input, multiline && styles.multiline]} placeholderTextColor="#9aaab2" multiline={multiline} /></View> }

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  titleWrap: { flex: 1 },
  addButton: { backgroundColor: '#087f8c', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, marginTop: 3 },
  addButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  datePickerWrap: { flex: 1 },
  todayButton: { borderRadius: 12, backgroundColor: '#e8f7f5', justifyContent: 'center', paddingHorizontal: 14 },
  todayText: { color: '#087f8c', fontSize: 12, fontWeight: '800' },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4eeee', borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start' },
  time: { width: 62, color: '#087f8c', fontSize: 13, fontWeight: '800' },
  body: { flex: 1, minWidth: 0 },
  patient: { color: '#17323d', fontSize: 14, fontWeight: '800' },
  detail: { color: '#71838e', fontSize: 11, marginTop: 5 },
  notes: { color: '#9aaab2', fontSize: 10, marginTop: 5 },
  cardActions: { alignItems: 'flex-end', marginLeft: 6 },
  status: { color: '#087f8c', fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  actionRow: { flexDirection: 'row', gap: 4, marginTop: 9 },
  actionButton: { borderRadius: 7, backgroundColor: '#f1f7f7', paddingHorizontal: 6, paddingVertical: 5 },
  checkText: { color: '#16805f', fontSize: 9, fontWeight: '800' },
  editText: { color: '#087f8c', fontSize: 9, fontWeight: '800' },
  deleteText: { color: '#c34b57', fontSize: 9, fontWeight: '800' },
  checked: { color: '#16805f', fontSize: 9, fontWeight: '800', marginTop: 5 },
  errorBanner: { color: '#c34b57', backgroundColor: '#fff0f1', borderRadius: 10, padding: 10, fontSize: 12, marginBottom: 12 },
  modalScreen: { flex: 1, backgroundColor: '#f7fbfb', paddingTop: 55 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e4eeee' },
  modalTitle: { color: '#17323d', fontSize: 22, fontWeight: '800' },
  modalSubtitle: { color: '#71838e', fontSize: 12, marginTop: 5 },
  close: { color: '#71838e', fontSize: 30, lineHeight: 28 },
  modalContent: { padding: 20, gap: 12, paddingBottom: 30 },
  label: { color: '#47606b', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#d8e5e6', borderRadius: 12, paddingHorizontal: 13, color: '#17323d', backgroundColor: '#ffffff' },
  multiline: { minHeight: 72, paddingTop: 12, textAlignVertical: 'top' },
  option: { borderWidth: 1, borderColor: '#e4eeee', backgroundColor: '#ffffff', borderRadius: 10, padding: 10 },
  optionName: { color: '#17323d', fontSize: 12, fontWeight: '800' },
  optionDetail: { color: '#71838e', fontSize: 10, marginTop: 3 },
  selectedPatient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, backgroundColor: '#e8f7f5', borderWidth: 1, borderColor: '#bce5df', padding: 12 },
  selectedBody: { flex: 1 },
  selectedName: { color: '#087f8c', fontSize: 13, fontWeight: '800' },
  selectedDetail: { color: '#3e7777', fontSize: 10, marginTop: 3 },
  changeText: { color: '#087f8c', fontSize: 11, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#d8e5e6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#ffffff', minWidth: 100 },
  smallChip: { borderWidth: 1, borderColor: '#d8e5e6', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#ffffff' },
  chipActive: { borderColor: '#087f8c', backgroundColor: '#e8f7f5' },
  chipText: { color: '#71838e', fontSize: 10, fontWeight: '700' },
  chipTextActive: { color: '#087f8c' },
  chipSubtext: { color: '#9aaab2', fontSize: 9, marginTop: 3 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  walkInRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#b8cdcf', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  checkboxActive: { backgroundColor: '#087f8c', borderColor: '#087f8c' },
  checkmark: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  walkInText: { color: '#47606b', fontSize: 12, fontWeight: '700' },
  formError: { color: '#c34b57', backgroundColor: '#fff0f1', borderRadius: 10, padding: 10, fontSize: 12 },
  conflictBox: { borderRadius: 13, backgroundColor: '#fff8e8', borderWidth: 1, borderColor: '#f0d895', padding: 12, gap: 6 },
  conflictTitle: { color: '#9b7110', fontSize: 12, fontWeight: '800' },
  conflictHint: { color: '#9b7110', fontSize: 10 },
  slot: { borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5c66d', paddingHorizontal: 10, paddingVertical: 7 },
  slotText: { color: '#9b7110', fontSize: 10, fontWeight: '800' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 15, borderTopWidth: 1, borderTopColor: '#e4eeee', backgroundColor: '#ffffff' },
  cancelButton: { borderRadius: 11, paddingHorizontal: 16, paddingVertical: 12 },
  cancelText: { color: '#71838e', fontSize: 12, fontWeight: '800' },
  saveButton: { borderRadius: 11, paddingHorizontal: 17, paddingVertical: 12, backgroundColor: '#087f8c' },
  saveText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
})
