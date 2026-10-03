import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { createDoctor, deleteDoctor, getBranches, getDoctors, updateDoctor, DoctorPayload } from '../api'
import { Branch, Doctor } from '../types'
import { EmptyState, Screen, ScreenTitle } from '../components/Screen'
import { readSession } from '../storage'

type DoctorForm = { fullName: string; specialization: string; licenseNumber: string; phone: string; email: string; branchId: string; bio: string; status: string }
const emptyForm: DoctorForm = { fullName: '', specialization: '', licenseNumber: '', phone: '', email: '', branchId: '', bio: '', status: 'ACTIVE' }

function fromDoctor(doctor: Doctor): DoctorForm {
  return { fullName: doctor.fullName, specialization: doctor.specialization, licenseNumber: doctor.licenseNumber ?? '', phone: doctor.phone ?? '', email: doctor.email ?? '', branchId: doctor.branchId ? String(doctor.branchId) : '', bio: doctor.bio ?? '', status: doctor.status }
}

export default function DoctorsScreen({ clinicName }: { clinicName: string }) {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<DoctorForm>(emptyForm)
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const session = await readSession(); if (!session) return; const [doctorData, branchData] = await Promise.all([getDoctors(session.token), getBranches(session.token)]); setDoctors(doctorData); setBranches(branchData); setError('') }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not load doctors.') }
    finally { setLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  const visibleDoctors = useMemo(() => {
    const search = query.trim().toLowerCase()
    return doctors.filter((doctor) => (statusFilter === 'ALL' || doctor.status === statusFilter) && (!search || `${doctor.fullName} ${doctor.specialization} ${doctor.phone ?? ''} ${doctor.email ?? ''}`.toLowerCase().includes(search)))
  }, [doctors, query, statusFilter])

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setError(''); setFormOpen(true) }
  const openEdit = (doctor: Doctor) => { setEditing(doctor); setForm(fromDoctor(doctor)); setError(''); setFormOpen(true) }
  const closeForm = () => { setEditing(null); setFormOpen(false); setForm({ ...emptyForm }) }

  async function save() {
    if (!form.fullName.trim() || !form.specialization.trim()) { setError('Full name and specialization are required.'); return }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) { setError('Enter a valid email address.'); return }
    setSaving(true); setError('')
    try {
      const session = await readSession(); if (!session) return
      const payload: DoctorPayload = { fullName: form.fullName.trim(), specialization: form.specialization.trim(), licenseNumber: form.licenseNumber.trim(), phone: form.phone.trim(), email: form.email.trim() || null, branchId: form.branchId ? Number(form.branchId) : null, bio: form.bio.trim(), status: form.status }
      const saved = editing ? await updateDoctor(session.token, editing.id, payload) : await createDoctor(session.token, payload)
      setDoctors((current) => editing ? current.map((doctor) => doctor.id === saved.id ? saved : doctor) : [saved, ...current]); closeForm()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to save doctor.') }
    finally { setSaving(false) }
  }

  function remove(doctor: Doctor) {
    Alert.alert('Delete doctor?', `Delete ${doctor.fullName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { const session = await readSession(); if (!session) return; await deleteDoctor(session.token, doctor.id); setDoctors((current) => current.filter((item) => item.id !== doctor.id)) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to delete doctor.') } } },
    ])
  }

  return <Screen scroll={false}>
    <View style={styles.titleRow}><View style={styles.titleWrap}><ScreenTitle title="Doctors" subtitle={`${clinicName} · Manage dentists and availability.`} /></View><TouchableOpacity style={styles.addButton} onPress={openCreate}><Text style={styles.addButtonText}>＋ Add</Text></TouchableOpacity></View>
    <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search name, specialty, or phone" placeholderTextColor="#9aaab2" />
    <View style={styles.filters}>{(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => <TouchableOpacity key={status} onPress={() => setStatusFilter(status)} style={[styles.filter, statusFilter === status && styles.filterActive]}><Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>{status === 'ALL' ? 'All' : status === 'ACTIVE' ? 'Active' : 'Inactive'}</Text></TouchableOpacity>)}</View>
    {error && !formOpen ? <Text style={styles.errorBanner}>{error}</Text> : null}
    {loading ? <ActivityIndicator size="large" color="#087f8c" /> : visibleDoctors.length === 0 ? <EmptyState message="No doctors found." /> : <ScrollView contentContainerStyle={styles.list}>{visibleDoctors.map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} branch={branches.find((item) => item.id === doctor.branchId)} onEdit={() => openEdit(doctor)} onDelete={() => remove(doctor)} />)}</ScrollView>}
    <DoctorModal visible={formOpen} editing={editing} form={form} setForm={setForm} branches={branches} saving={saving} error={error} onClose={closeForm} onSave={save} />
  </Screen>
}

function DoctorCard({ doctor, branch, onEdit, onDelete }: { doctor: Doctor; branch?: Branch; onEdit: () => void; onDelete: () => void }) {
  return <View style={styles.card}><View style={styles.avatar}><Text style={styles.avatarText}>⚕</Text></View><View style={styles.body}><Text style={styles.name}>{doctor.fullName}</Text><Text style={styles.specialization}>{doctor.specialization}</Text><Text style={styles.detail}>{doctor.phone || 'Phone not recorded'}{doctor.email ? ` · ${doctor.email}` : ''}</Text><Text style={styles.subDetail}>{doctor.licenseNumber || 'License not recorded'} · {branch?.name || 'No branch'}</Text></View><View style={styles.actions}><Text style={[styles.badge, doctor.status === 'INACTIVE' && styles.inactiveBadge]}>{doctor.status.toLowerCase()}</Text><View style={styles.actionRow}><TouchableOpacity onPress={onEdit} style={styles.actionButton}><Text style={styles.editText}>Edit</Text></TouchableOpacity><TouchableOpacity onPress={onDelete} style={styles.actionButton}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity></View></View></View>
}

function DoctorModal({ visible, editing, form, setForm, branches, saving, error, onClose, onSave }: { visible: boolean; editing: Doctor | null; form: DoctorForm; setForm: (form: DoctorForm) => void; branches: Branch[]; saving: boolean; error: string; onClose: () => void; onSave: () => void }) {
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><View style={styles.modalScreen}><View style={styles.modalHeader}><View><Text style={styles.modalTitle}>{editing ? 'Edit doctor' : 'Add doctor'}</Text><Text style={styles.modalSubtitle}>Keep the professional profile ready for scheduling.</Text></View><TouchableOpacity onPress={onClose}><Text style={styles.close}>×</Text></TouchableOpacity></View><ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled"><Field label="Full name" required value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })} /><Field label="Specialization" required value={form.specialization} onChange={(value) => setForm({ ...form, specialization: value })} /><Field label="License number" value={form.licenseNumber} onChange={(value) => setForm({ ...form, licenseNumber: value })} /><Field label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} keyboardType="phone-pad" /><Field label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} keyboardType="email-address" /><Text style={styles.label}>Branch</Text><View style={styles.chips}><TouchableOpacity onPress={() => setForm({ ...form, branchId: '' })} style={[styles.chip, !form.branchId && styles.chipActive]}><Text style={[styles.chipText, !form.branchId && styles.chipTextActive]}>No branch</Text></TouchableOpacity>{branches.map((branch) => <TouchableOpacity key={branch.id} onPress={() => setForm({ ...form, branchId: String(branch.id) })} style={[styles.chip, form.branchId === String(branch.id) && styles.chipActive]}><Text style={[styles.chipText, form.branchId === String(branch.id) && styles.chipTextActive]}>{branch.name}</Text></TouchableOpacity>)}</View><Text style={styles.label}>Status</Text><View style={styles.chips}>{['ACTIVE', 'INACTIVE'].map((status) => <TouchableOpacity key={status} onPress={() => setForm({ ...form, status })} style={[styles.chip, form.status === status && styles.chipActive]}><Text style={[styles.chipText, form.status === status && styles.chipTextActive]}>{status}</Text></TouchableOpacity>)}</View><Field label="Bio" value={form.bio} onChange={(value) => setForm({ ...form, bio: value })} multiline />{error ? <Text style={styles.formError}>{error}</Text> : null}</ScrollView><View style={styles.modalFooter}><TouchableOpacity onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={saving} onPress={onSave} style={styles.saveButton}><Text style={styles.saveText}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Create doctor'}</Text></TouchableOpacity></View></View></Modal>
}

function Field({ label, value, onChange, required = false, keyboardType = 'default', multiline = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; keyboardType?: 'default' | 'phone-pad' | 'email-address'; multiline?: boolean }) { return <View><Text style={styles.label}>{label}{required ? ' *' : ''}</Text><TextInput value={value} onChangeText={onChange} keyboardType={keyboardType} multiline={multiline} style={[styles.input, multiline && styles.multiline]} placeholderTextColor="#9aaab2" /></View> }

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' }, titleWrap: { flex: 1 }, addButton: { backgroundColor: '#087f8c', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, marginTop: 3 }, addButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  search: { height: 48, backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#dce9e9', paddingHorizontal: 14, color: '#17323d', marginBottom: 10 }, filters: { flexDirection: 'row', gap: 8, marginBottom: 14 }, filter: { borderRadius: 9, backgroundColor: '#edf4f4', paddingHorizontal: 13, paddingVertical: 8 }, filterActive: { backgroundColor: '#087f8c' }, filterText: { color: '#71838e', fontSize: 11, fontWeight: '800' }, filterTextActive: { color: '#ffffff' }, list: { paddingBottom: 24 },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4eeee', borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start' }, avatar: { height: 42, width: 42, borderRadius: 14, backgroundColor: '#f0eaff', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, avatarText: { color: '#7457bf', fontSize: 19, fontWeight: '800' }, body: { flex: 1, minWidth: 0 }, name: { color: '#17323d', fontSize: 14, fontWeight: '800' }, specialization: { color: '#087f8c', fontSize: 12, fontWeight: '700', marginTop: 4 }, detail: { color: '#71838e', fontSize: 11, marginTop: 5 }, subDetail: { color: '#9aaab2', fontSize: 10, marginTop: 4 }, actions: { alignItems: 'flex-end', marginLeft: 6 }, badge: { color: '#087f8c', fontSize: 10, fontWeight: '800', textTransform: 'capitalize' }, inactiveBadge: { color: '#9aaab2' }, actionRow: { flexDirection: 'row', gap: 5, marginTop: 11 }, actionButton: { borderRadius: 7, backgroundColor: '#f1f7f7', paddingHorizontal: 7, paddingVertical: 5 }, editText: { color: '#087f8c', fontSize: 10, fontWeight: '800' }, deleteText: { color: '#c34b57', fontSize: 10, fontWeight: '800' }, errorBanner: { color: '#c34b57', backgroundColor: '#fff0f1', borderRadius: 10, padding: 10, fontSize: 12, marginBottom: 12 },
  modalScreen: { flex: 1, backgroundColor: '#f7fbfb', paddingTop: 55 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e4eeee' }, modalTitle: { color: '#17323d', fontSize: 22, fontWeight: '800' }, modalSubtitle: { color: '#71838e', fontSize: 12, marginTop: 5 }, close: { color: '#71838e', fontSize: 30, lineHeight: 28 }, modalContent: { padding: 20, gap: 13, paddingBottom: 30 }, label: { color: '#47606b', fontSize: 12, fontWeight: '700', marginBottom: 6 }, input: { minHeight: 46, borderWidth: 1, borderColor: '#d8e5e6', borderRadius: 12, paddingHorizontal: 13, color: '#17323d', backgroundColor: '#ffffff' }, multiline: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: '#d8e5e6', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: '#ffffff' }, chipActive: { borderColor: '#087f8c', backgroundColor: '#e8f7f5' }, chipText: { color: '#71838e', fontSize: 11, fontWeight: '700' }, chipTextActive: { color: '#087f8c' }, formError: { color: '#c34b57', backgroundColor: '#fff0f1', borderRadius: 10, padding: 10, fontSize: 12 }, modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 15, borderTopWidth: 1, borderTopColor: '#e4eeee', backgroundColor: '#ffffff' }, cancelButton: { borderRadius: 11, paddingHorizontal: 16, paddingVertical: 12 }, cancelText: { color: '#71838e', fontSize: 12, fontWeight: '800' }, saveButton: { borderRadius: 11, paddingHorizontal: 17, paddingVertical: 12, backgroundColor: '#087f8c' }, saveText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
})
