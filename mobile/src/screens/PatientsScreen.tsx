import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getPatients } from '../api'
import { Patient } from '../types'
import { EmptyState, Screen, ScreenTitle } from '../components/Screen'
import { readSession } from '../storage'

export default function PatientsScreen({ clinicName }: { clinicName: string }) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (search = query) => {
    setLoading(true)
    try { const session = await readSession(); if (!session) return; setPatients(await getPatients(session.token, search)); setError('') }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not load patients.') }
    finally { setLoading(false) }
  }, [query])

  useFocusEffect(useCallback(() => { void load('') }, [load]))

  return <Screen scroll={false}>
    <ScreenTitle title="Patients" subtitle={`${clinicName} · Find and review your patient records.`} />
    <TextInput style={styles.search} value={query} onChangeText={setQuery} onSubmitEditing={() => load()} returnKeyType="search" placeholder="Search name, phone, or email" placeholderTextColor="#9aaab2" />
    {loading ? <ActivityIndicator size="large" color="#087f8c" /> : error ? <EmptyState message={error} /> : patients.length === 0 ? <EmptyState message="No patients found." /> : <FlatList data={patients} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list} renderItem={({ item }) => <PatientCard patient={item} />} />}
  </Screen>
}

function PatientCard({ patient }: { patient: Patient }) { return <View style={styles.card}><View style={styles.avatar}><Text style={styles.avatarText}>{patient.fullName.slice(0, 1).toUpperCase()}</Text></View><View style={styles.body}><Text style={styles.name}>{patient.fullName}</Text><Text style={styles.detail}>{patient.phone}{patient.email ? ` · ${patient.email}` : ''}</Text></View><Text style={styles.badge}>{patient.status.toLowerCase()}</Text></View> }

const styles = StyleSheet.create({
  search: { height: 48, backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#dce9e9', paddingHorizontal: 14, color: '#17323d', marginBottom: 14 },
  list: { paddingBottom: 24 },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4eeee', borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  avatar: { height: 42, width: 42, borderRadius: 14, backgroundColor: '#dff3f0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#087f8c', fontSize: 17, fontWeight: '800' },
  body: { flex: 1 },
  name: { color: '#17323d', fontSize: 14, fontWeight: '800' },
  detail: { color: '#71838e', fontSize: 11, marginTop: 5 },
  badge: { color: '#087f8c', fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
})
