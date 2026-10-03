import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AuthUser } from '../types'
import { Screen, ScreenTitle } from '../components/Screen'
import { getApiBaseUrl } from '../api'

export default function MoreScreen({ user, onLogout }: { user: AuthUser; onLogout: () => Promise<void> }) {
  return <Screen>
    <ScreenTitle title="More" subtitle={`${user.clinicName} · Account and mobile app settings.`} />
    <View style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text></View><Text style={styles.name}>{user.name}</Text><Text style={styles.email}>{user.email}</Text><Text style={styles.role}>{user.role}</Text></View>
    <View style={styles.info}><Text style={styles.infoLabel}>Clinic</Text><Text style={styles.infoValue}>{user.clinicName}</Text></View><View style={styles.info}><Text style={styles.infoLabel}>Connected API</Text><Text style={styles.infoValue}>{getApiBaseUrl()}</Text></View>
    <TouchableOpacity style={styles.logout} onPress={onLogout}><Text style={styles.logoutText}>Sign out</Text></TouchableOpacity>
  </Screen>
}

const styles = StyleSheet.create({
  profile: { alignItems: 'center', padding: 24, borderRadius: 20, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4eeee' },
  avatar: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#dff3f0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#087f8c', fontSize: 26, fontWeight: '800' },
  name: { color: '#17323d', fontSize: 18, fontWeight: '800' },
  email: { color: '#71838e', fontSize: 13, marginTop: 5 },
  role: { color: '#087f8c', fontSize: 11, fontWeight: '800', marginTop: 10, textTransform: 'uppercase' },
  info: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4eeee', borderRadius: 16, padding: 16, marginTop: 14 },
  infoLabel: { color: '#71838e', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { color: '#17323d', fontSize: 13, marginTop: 7 },
  logout: { height: 50, borderRadius: 14, backgroundColor: '#fff0f1', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  logoutText: { color: '#c34b57', fontSize: 14, fontWeight: '800' },
})
