import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { createPatient, deletePatient, getPatients, PatientPayload, updatePatient } from '../api'
import { Patient } from '../types'
import { EmptyState, Screen, ScreenTitle } from '../components/Screen'
import DateTimeField from '../components/DateTimeField'
import { readSession } from '../storage'

type PatientForm = PatientPayload

const emptyForm: PatientForm = { fullName: '', phone: '', email: null, dateOfBirth: '', gender: '', address: '', emergencyContact: '', medicalNotes: '', allergies: '', medications: '', medicalHistory: '', status: 'ACTIVE', password: null }

function fromPatient(patient: Patient): PatientForm {
  return { fullName: patient.fullName, phone: patient.phone, email: patient.email, dateOfBirth: patient.dateOfBirth ?? '', gender: patient.gender ?? '', address: patient.address ?? '', emergencyContact: patient.emergencyContact ?? '', medicalNotes: patient.medicalNotes ?? '', allergies: patient.allergies ?? '', medications: patient.medications ?? '', medicalHistory: patient.medicalHistory ?? '', status: patient.status, password: null }
}

export default function PatientsScreen({ clinicName }: { clinicName: string }) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<PatientForm>(emptyForm)
  const [editing, setEditing] = useState<Patient | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (search = query) => {
    setLoading(true)
    try { const session = await readSession(); if (!session) return; setPatients(await getPatients(session.token, search)); setError('') }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not load patients.') }
    finally { setLoading(false) }
  }, [query])

  useFocusEffect(useCallback(() => { void load('') }, [load]))

  const visiblePatients = patients.filter((patient) => statusFilter === 'ALL' || patient.status === statusFilter)
  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setError(''); setFormOpen(true) }
  const openEdit = (patient: Patient) => { setEditing(patient); setForm(fromPatient(patient)); setError(''); setFormOpen(true) }
  const closeForm = () => { setEditing(null); setFormOpen(false); setForm({ ...emptyForm }) }

  async function save() {
    if (!form.fullName.trim() || !form.phone.trim()) { setError('Full name and phone are required.'); return }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) { setError('Enter a valid email address.'); return }
    if (form.password && form.password.length < 6) { setError('Patient portal password must be at least 6 characters.'); return }
    setSaving(true); setError('')
    try {
      const session = await readSession(); if (!session) return
      const payload: PatientPayload = { ...form, fullName: form.fullName.trim(), phone: form.phone.trim(), email: form.email?.trim() || null, dateOfBirth: form.dateOfBirth?.trim() || null, password: form.password?.trim() || null }
      const saved = editing ? await updatePatient(session.token, editing.id, payload) : await createPatient(session.token, payload)
      setPatients((current) => editing ? current.map((patient) => patient.id === saved.id ? saved : patient) : [saved, ...current])
      closeForm()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to save patient.') }
    finally { setSaving(false) }
  }

  function remove(patient: Patient) {
    Alert.alert('Delete patient?', `Delete ${patient.fullName}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { const session = await readSession(); if (!session) return; await deletePatient(session.token, patient.id); setPatients((current) => current.filter((item) => item.id !== patient.id)) }
        catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to delete patient.') }
      } },
    ])
  }

  return <Screen scroll={false}>
    <View style={styles.titleRow}><View style={styles.titleWrap}><ScreenTitle title="Patients" subtitle={`${clinicName} · Manage patient records.`} /></View><TouchableOpacity style={styles.addButton} onPress={openCreate}><Text style={styles.addButtonText}>＋ Add</Text></TouchableOpacity></View>
    <TextInput style={styles.search} value={query} onChangeText={setQuery} onSubmitEditing={() => load()} returnKeyType="search" placeholder="Search name, phone, or email" placeholderTextColor="#9aaab2" />
    <View style={styles.filters}>{(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => <TouchableOpacity key={status} onPress={() => setStatusFilter(status)} style={[styles.filter, statusFilter === status && styles.filterActive]}><Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>{status === 'ALL' ? 'All' : status === 'ACTIVE' ? 'Active' : 'Inactive'}</Text></TouchableOpacity>)}</View>
    {error && !formOpen ? <Text style={styles.errorBanner}>{error}</Text> : null}
    {loading ? <ActivityIndicator size="large" color="#087f8c" /> : visiblePatients.length === 0 ? <EmptyState message="No patients found." /> : <FlatList data={visiblePatients} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list} renderItem={({ item }) => <PatientCard patient={item} onEdit={() => openEdit(item)} onDelete={() => remove(item)} />} />}
    <PatientModal visible={formOpen} editing={editing} form={form} setForm={setForm} saving={saving} error={error} onClose={closeForm} onSave={save} />
  </Screen>
}

function PatientCard({ patient, onEdit, onDelete }: { patient: Patient; onEdit: () => void; onDelete: () => void }) {
  return <View style={styles.card}><View style={styles.avatar}><Text style={styles.avatarText}>{patient.fullName.slice(0, 1).toUpperCase()}</Text></View><View style={styles.body}><Text style={styles.name}>{patient.fullName}</Text><Text style={styles.detail}>{patient.phone}{patient.email ? ` · ${patient.email}` : ''}</Text><Text style={styles.subDetail}>{patient.dateOfBirth ? `DOB ${patient.dateOfBirth}` : 'DOB not recorded'} · {patient.patientLoginEnabled ? 'Portal enabled' : 'Portal not enabled'}</Text></View><View style={styles.actions}><Text style={[styles.badge, patient.status === 'INACTIVE' && styles.inactiveBadge]}>{patient.status.toLowerCase()}</Text><View style={styles.actionRow}><TouchableOpacity onPress={onEdit} style={styles.actionButton}><Text style={styles.editText}>Edit</Text></TouchableOpacity><TouchableOpacity onPress={onDelete} style={styles.actionButton}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity></View></View></View>
}

function PatientModal({ visible, editing, form, setForm, saving, error, onClose, onSave }: { visible: boolean; editing: Patient | null; form: PatientForm; setForm: (form: PatientForm) => void; saving: boolean; error: string; onClose: () => void; onSave: () => void }) {
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><View style={styles.modalScreen}><View style={styles.modalHeader}><View><Text style={styles.modalTitle}>{editing ? 'Edit patient' : 'Add patient'}</Text><Text style={styles.modalSubtitle}>Keep patient information accurate and up to date.</Text></View><TouchableOpacity onPress={onClose}><Text style={styles.close}>×</Text></TouchableOpacity></View><ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled"><Field label="Full name" required value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })} /><Field label="Phone" required value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} keyboardType="phone-pad" /><Field label="Email" value={form.email ?? ''} onChange={(value) => setForm({ ...form, email: value })} keyboardType="email-address" /><Field label="Date of birth (YYYY-MM-DD)" value={form.dateOfBirth ?? ''} onChange={(value) => setForm({ ...form, dateOfBirth: value })} /><Text style={styles.label}>Gender</Text><View style={styles.chips}>{['', 'FEMALE', 'MALE', 'OTHER'].map((value) => <TouchableOpacity key={value || 'none'} onPress={() => setForm({ ...form, gender: value })} style={[styles.chip, form.gender === value && styles.chipActive]}><Text style={[styles.chipText, form.gender === value && styles.chipTextActive]}>{value || 'Not set'}</Text></TouchableOpacity>)}</View><Text style={styles.label}>Status</Text><View style={styles.chips}>{['ACTIVE', 'INACTIVE'].map((value) => <TouchableOpacity key={value} onPress={() => setForm({ ...form, status: value })} style={[styles.chip, form.status === value && styles.chipActive]}><Text style={[styles.chipText, form.status === value && styles.chipTextActive]}>{value}</Text></TouchableOpacity>)}</View><Field label="Address" value={form.address} onChange={(value) => setForm({ ...form, address: value })} /><Field label="Emergency contact" value={form.emergencyContact} onChange={(value) => setForm({ ...form, emergencyContact: value })} keyboardType="phone-pad" /><Field label="Allergies" value={form.allergies} onChange={(value) => setForm({ ...form, allergies: value })} multiline /><Field label="Medications" value={form.medications} onChange={(value) => setForm({ ...form, medications: value })} multiline /><Field label="Medical history" value={form.medicalHistory} onChange={(value) => setForm({ ...form, medicalHistory: value })} multiline /><Field label="Medical notes" value={form.medicalNotes} onChange={(value) => setForm({ ...form, medicalNotes: value })} multiline /><View style={styles.portalBox}><Text style={styles.portalTitle}>Patient portal access</Text><Text style={styles.portalHint}>Set a password to let this patient sign in with their email.</Text><Field label={editing ? 'New password (leave blank to keep current)' : 'Password'} value={form.password ?? ''} onChange={(value) => setForm({ ...form, password: value })} secureTextEntry /></View>{error ? <Text style={styles.formError}>{error}</Text> : null}</ScrollView><View style={styles.modalFooter}><TouchableOpacity onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={saving} onPress={onSave} style={styles.saveButton}><Text style={styles.saveText}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Create patient'}</Text></TouchableOpacity></View></View></Modal>
}

function Field({ label, value, onChange, required = false, keyboardType = 'default', multiline = false, secureTextEntry = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; keyboardType?: 'default' | 'phone-pad' | 'email-address'; multiline?: boolean; secureTextEntry?: boolean }) {
  if (label.startsWith('Date of birth')) return <DateTimeField label="Date of birth" value={value} placeholder="Optional" onChange={onChange} />
  return <View><Text style={styles.label}>{label}{required ? ' *' : ''}</Text><TextInput value={value} onChangeText={onChange} keyboardType={keyboardType} secureTextEntry={secureTextEntry} multiline={multiline} style={[styles.input, multiline && styles.multiline]} placeholderTextColor="#9aaab2" /></View>
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  titleWrap: { flex: 1 },
  addButton: { backgroundColor: '#087f8c', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, marginTop: 3 },
  addButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  search: { height: 48, backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#dce9e9', paddingHorizontal: 14, color: '#17323d', marginBottom: 10 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filter: { borderRadius: 9, backgroundColor: '#edf4f4', paddingHorizontal: 13, paddingVertical: 8 },
  filterActive: { backgroundColor: '#087f8c' },
  filterText: { color: '#71838e', fontSize: 11, fontWeight: '800' },
  filterTextActive: { color: '#ffffff' },
  list: { paddingBottom: 24 },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4eeee', borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { height: 42, width: 42, borderRadius: 14, backgroundColor: '#dff3f0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#087f8c', fontSize: 17, fontWeight: '800' },
  body: { flex: 1, minWidth: 0 },
  name: { color: '#17323d', fontSize: 14, fontWeight: '800' },
  detail: { color: '#71838e', fontSize: 11, marginTop: 5 },
  subDetail: { color: '#9aaab2', fontSize: 10, marginTop: 4 },
  actions: { alignItems: 'flex-end', marginLeft: 6 },
  badge: { color: '#087f8c', fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  inactiveBadge: { color: '#9aaab2' },
  actionRow: { flexDirection: 'row', gap: 5, marginTop: 11 },
  actionButton: { borderRadius: 7, backgroundColor: '#f1f7f7', paddingHorizontal: 7, paddingVertical: 5 },
  editText: { color: '#087f8c', fontSize: 10, fontWeight: '800' },
  deleteText: { color: '#c34b57', fontSize: 10, fontWeight: '800' },
  errorBanner: { color: '#c34b57', backgroundColor: '#fff0f1', borderRadius: 10, padding: 10, fontSize: 12, marginBottom: 12 },
  modalScreen: { flex: 1, backgroundColor: '#f7fbfb', paddingTop: 55 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e4eeee' },
  modalTitle: { color: '#17323d', fontSize: 22, fontWeight: '800' },
  modalSubtitle: { color: '#71838e', fontSize: 12, marginTop: 5 },
  close: { color: '#71838e', fontSize: 30, lineHeight: 28 },
  modalContent: { padding: 20, gap: 13, paddingBottom: 30 },
  label: { color: '#47606b', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#d8e5e6', borderRadius: 12, paddingHorizontal: 13, color: '#17323d', backgroundColor: '#ffffff' },
  multiline: { minHeight: 72, paddingTop: 12, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 2 },
  chip: { borderWidth: 1, borderColor: '#d8e5e6', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: '#ffffff' },
  chipActive: { borderColor: '#087f8c', backgroundColor: '#e8f7f5' },
  chipText: { color: '#71838e', fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#087f8c' },
  portalBox: { borderRadius: 15, backgroundColor: '#e8f7f5', borderWidth: 1, borderColor: '#bce5df', padding: 14, gap: 6 },
  portalTitle: { color: '#087f8c', fontSize: 13, fontWeight: '800' },
  portalHint: { color: '#3e7777', fontSize: 11, lineHeight: 16 },
  formError: { color: '#c34b57', backgroundColor: '#fff0f1', borderRadius: 10, padding: 10, fontSize: 12 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 15, borderTopWidth: 1, borderTopColor: '#e4eeee', backgroundColor: '#ffffff' },
  cancelButton: { borderRadius: 11, paddingHorizontal: 16, paddingVertical: 12 },
  cancelText: { color: '#71838e', fontSize: 12, fontWeight: '800' },
  saveButton: { borderRadius: 11, paddingHorizontal: 17, paddingVertical: 12, backgroundColor: '#087f8c' },
  saveText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
})
