import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { NavigationContainer } from '@react-navigation/native'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { AuthUser } from './types'
import LoginScreen from './screens/LoginScreen'
import DashboardScreen from './screens/DashboardScreen'
import PatientsScreen from './screens/PatientsScreen'
import AppointmentsScreen from './screens/AppointmentsScreen'
import MoreScreen from './screens/MoreScreen'
import PatientPortalScreen from './screens/PatientPortalScreen'
import AdminScreen from './screens/AdminScreen'

export type RootStackParamList = {
  Login: undefined
  Main: undefined
}

export type MainTabParamList = {
  Dashboard: undefined
  Patients: undefined
  Appointments: undefined
  More: undefined
  Admin: undefined
}

export type PatientTabParamList = { Portal: undefined; More: undefined }

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<MainTabParamList>()
const PatientTabs = createBottomTabNavigator<PatientTabParamList>()

const tabIcon: Record<keyof MainTabParamList, string> = {
  Dashboard: '⌂',
  Patients: '♙',
  Appointments: '▣',
  More: '•••',
  Admin: '✦',
}

function PatientTabNavigator({ user, onLogout }: { user: AuthUser; onLogout: () => Promise<void> }) {
  return <PatientTabs.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: '#087f8c', tabBarInactiveTintColor: '#8a98a7', tabBarLabelStyle: styles.tabLabel, tabBarStyle: styles.tabBar, tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>{route.name === 'Portal' ? '▣' : '•••'}</Text> })}>
    <PatientTabs.Screen name="Portal">{() => <PatientPortalScreen clinicName={user.clinicName} />}</PatientTabs.Screen>
    <PatientTabs.Screen name="More">{() => <MoreScreen user={user} onLogout={onLogout} />}</PatientTabs.Screen>
  </PatientTabs.Navigator>
}

function MainTabs({ user, onLogout }: { user: AuthUser; onLogout: () => Promise<void> }) {
  if (user.role === 'Patient') return <PatientTabNavigator user={user} onLogout={onLogout} />
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#087f8c',
        tabBarInactiveTintColor: '#8a98a7',
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>{tabIcon[route.name]}</Text>,
      })}
    >
      <Tabs.Screen name="Dashboard">{() => <DashboardScreen user={user} />}</Tabs.Screen>
      <Tabs.Screen name="Patients">{() => <PatientsScreen clinicName={user.clinicName} />}</Tabs.Screen>
      <Tabs.Screen name="Appointments">{() => <AppointmentsScreen clinicName={user.clinicName} />}</Tabs.Screen>
      {user.role === 'Administrator' ? <Tabs.Screen name="Admin">{() => <AdminScreen user={user} />}</Tabs.Screen> : null}
      <Tabs.Screen name="More">{() => <MoreScreen user={user} onLogout={onLogout} />}</Tabs.Screen>
    </Tabs.Navigator>
  )
}

export default function Navigation({ session, loading, clinicName, onLogin, onLogout }: {
  session: { token: string; user: AuthUser } | null
  loading: boolean
  clinicName: string
  onLogin: (token: string, user: AuthUser) => Promise<void>
  onLogout: () => Promise<void>
}) {
  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#087f8c" /></View>
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Main">
            {() => <MainTabs user={session.user} onLogout={onLogout} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login">
            {() => <LoginScreen clinicName={clinicName} onLogin={onLogin} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7fbfb' },
  tabBar: { height: 68, paddingTop: 6, paddingBottom: 8, borderTopColor: '#e4eeee', backgroundColor: '#ffffff' },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabIcon: { fontSize: 21, fontWeight: '700' },
})
