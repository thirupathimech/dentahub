import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { NavigationContainer } from '@react-navigation/native'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AuthUser, ClinicSettings } from './types'
import LoginScreen from './screens/LoginScreen'
import DashboardScreen from './screens/DashboardScreen'
import PatientsScreen from './screens/PatientsScreen'
import AppointmentsScreen from './screens/AppointmentsScreen'
import MoreScreen from './screens/MoreScreen'
import PatientPortalScreen, { PatientPortalSection } from './screens/PatientPortalScreen'
import AdminScreen from './screens/AdminScreen'
import DoctorsScreen from './screens/DoctorsScreen'
import TreatmentsScreen from './screens/TreatmentsScreen'
import TreatmentPlansScreen from './screens/TreatmentPlansScreen'
import BillingScreen from './screens/BillingScreen'
import PaymentsScreen from './screens/PaymentsScreen'
import UsersRolesScreen from './screens/UsersRolesScreen'
import BranchScreen from './screens/BranchScreen'
import SettingsScreen from './screens/SettingsScreen'
import ConsultationsScreen from './screens/ConsultationsScreen'
import DentalChartScreen from './screens/DentalChartScreen'

export type RootStackParamList = {
  Login: undefined
  Main: undefined
}

export type MainTabParamList = {
  Dashboard: undefined
  Patients: undefined
  Appointments: undefined
  Doctors: undefined
  Consultation: undefined
  DentalChart: undefined
  Treatments: undefined
  TreatmentPlans: undefined
  Billing: undefined
  Payments: undefined
  UsersRoles: undefined
  Branch: undefined
  Settings: undefined
  More: undefined
  Admin: undefined
}

export type PatientTabParamList = { Overview: undefined; Appointments: undefined; Bills: undefined; Payments: undefined; More: undefined }

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<MainTabParamList>()
const PatientTabs = createBottomTabNavigator<PatientTabParamList>()

const tabIcon: Record<keyof MainTabParamList, string> = {
  Dashboard: '⌂',
  Patients: '♙',
  Appointments: '▣',
  Doctors: '⚕',
  Consultation: '✚',
  DentalChart: '☷',
  Treatments: '✦',
  TreatmentPlans: '☷',
  Billing: '▤',
  Payments: '₹',
  UsersRoles: '♙',
  Branch: '⌖',
  Settings: '⚙',
  More: '•••',
  Admin: '✦',
}

function SignOutButton({ onLogout }: { onLogout: () => Promise<void> }) {
  return <TouchableOpacity onPress={() => Alert.alert('Sign out?', 'You can sign in again anytime.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => { void onLogout() } }])} style={styles.signOutButton}><Text style={styles.signOutText}>Sign out</Text></TouchableOpacity>
}

function headerOptions(clinicName: string, onLogout: () => Promise<void>) {
  return { headerShown: true, headerTitle: clinicName, headerTitleStyle: styles.headerTitle, headerStyle: styles.header, headerRight: () => <SignOutButton onLogout={onLogout} /> }
}

function PatientTabNavigator({ user, onLogout }: { user: AuthUser; onLogout: () => Promise<void> }) {
  const patientSection = (name: string): PatientPortalSection => name.toLowerCase() as PatientPortalSection
  return <PatientTabs.Navigator tabBar={(props) => <ScrollableTabBar {...props} iconForRoute={(name) => name === 'Overview' ? '⌂' : name === 'Appointments' ? '▣' : name === 'Bills' ? '▤' : name === 'Payments' ? '₹' : '•••'} />} screenOptions={headerOptions(user.clinicName, onLogout)}>
    <PatientTabs.Screen name="Overview">{() => <PatientPortalScreen clinicName={user.clinicName} section={patientSection('overview')} />}</PatientTabs.Screen>
    <PatientTabs.Screen name="Appointments">{() => <PatientPortalScreen clinicName={user.clinicName} section={patientSection('appointments')} />}</PatientTabs.Screen>
    <PatientTabs.Screen name="Bills">{() => <PatientPortalScreen clinicName={user.clinicName} section={patientSection('bills')} />}</PatientTabs.Screen>
    <PatientTabs.Screen name="Payments">{() => <PatientPortalScreen clinicName={user.clinicName} section={patientSection('payments')} />}</PatientTabs.Screen>
    <PatientTabs.Screen name="More">{() => <MoreScreen user={user} onLogout={onLogout} />}</PatientTabs.Screen>
  </PatientTabs.Navigator>
}

function MainTabs({ user, onLogout, onSettingsSaved }: { user: AuthUser; onLogout: () => Promise<void>; onSettingsSaved: (settings: ClinicSettings) => Promise<void> }) {
  if (user.role === 'Patient') return <PatientTabNavigator user={user} onLogout={onLogout} />
  return (
    <Tabs.Navigator
      tabBar={(props) => <ScrollableTabBar {...props} iconForRoute={(name) => tabIcon[name as keyof MainTabParamList]} />}
      screenOptions={headerOptions(user.clinicName, onLogout)}
    >
      <Tabs.Screen name="Dashboard">{() => <DashboardScreen user={user} />}</Tabs.Screen>
      <Tabs.Screen name="Patients">{() => <PatientsScreen clinicName={user.clinicName} />}</Tabs.Screen>
      <Tabs.Screen name="Appointments">{() => <AppointmentsScreen clinicName={user.clinicName} />}</Tabs.Screen>
      {(user.role === 'Administrator' || user.permissions.includes('doctors')) ? <Tabs.Screen name="Doctors">{() => <DoctorsScreen clinicName={user.clinicName} />}</Tabs.Screen> : null}
      {(user.role === 'Administrator' || user.permissions.includes('consultation')) ? <Tabs.Screen name="Consultation" options={{ tabBarLabel: 'Consultations' }}>{() => <ConsultationsScreen clinicName={user.clinicName} />}</Tabs.Screen> : null}
      {(user.role === 'Administrator' || user.permissions.includes('dental-chart')) ? <Tabs.Screen name="DentalChart" options={{ tabBarLabel: 'Dental Chart' }}>{() => <DentalChartScreen clinicName={user.clinicName} />}</Tabs.Screen> : null}
      {(user.role === 'Administrator' || user.permissions.includes('treatments')) ? <Tabs.Screen name="Treatments">{() => <TreatmentsScreen clinicName={user.clinicName} />}</Tabs.Screen> : null}
      {(user.role === 'Administrator' || user.permissions.includes('treatment-plans')) ? <Tabs.Screen name="TreatmentPlans" options={{ tabBarLabel: 'Treatment Plans' }}>{() => <TreatmentPlansScreen clinicName={user.clinicName} />}</Tabs.Screen> : null}
      {(user.role === 'Administrator' || user.permissions.includes('billing')) ? <Tabs.Screen name="Billing">{() => <BillingScreen clinicName={user.clinicName} />}</Tabs.Screen> : null}
      {(user.role === 'Administrator' || user.permissions.includes('payments')) ? <Tabs.Screen name="Payments">{() => <PaymentsScreen clinicName={user.clinicName} />}</Tabs.Screen> : null}
      {(user.role === 'Administrator' || user.permissions.includes('users-roles')) ? <Tabs.Screen name="UsersRoles" options={{ tabBarLabel: 'Users / Roles' }}>{() => <UsersRolesScreen clinicName={user.clinicName} />}</Tabs.Screen> : null}
      {(user.role === 'Administrator' || user.permissions.includes('branch')) ? <Tabs.Screen name="Branch" options={{ tabBarLabel: 'Branches' }}>{() => <BranchScreen clinicName={user.clinicName} />}</Tabs.Screen> : null}
      {(user.role === 'Administrator' || user.permissions.includes('settings')) ? <Tabs.Screen name="Settings">{() => <SettingsScreen clinicName={user.clinicName} onSettingsSaved={onSettingsSaved} />}</Tabs.Screen> : null}
      {user.role === 'Administrator' ? <Tabs.Screen name="Admin">{() => <AdminScreen user={user} />}</Tabs.Screen> : null}
      <Tabs.Screen name="More">{() => <MoreScreen user={user} onLogout={onLogout} />}</Tabs.Screen>
    </Tabs.Navigator>
  )
}

function ScrollableTabBar({ state, descriptors, navigation, iconForRoute }: BottomTabBarProps & { iconForRoute: (name: string) => string }) {
  return <View style={styles.scrollTabBar}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollTabContent}>{state.routes.map((route, index) => { const { options } = descriptors[route.key]; const focused = state.index === index; const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name; const onPress = () => { const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params) }; return <TouchableOpacity key={route.key} accessibilityRole="button" accessibilityState={focused ? { selected: true } : {}} accessibilityLabel={options.tabBarAccessibilityLabel} onPress={onPress} style={[styles.scrollTab, focused && styles.scrollTabActive]}><Text style={[styles.tabIcon, { color: focused ? '#087f8c' : '#8a98a7' }]}>{iconForRoute(route.name)}</Text><Text style={[styles.tabLabel, { color: focused ? '#087f8c' : '#8a98a7' }]}>{label}</Text></TouchableOpacity> })}</ScrollView></View>
}

export default function Navigation({ session, loading, clinicName, clinicLogo, onLogin, onLogout, onSettingsSaved }: {
  session: { token: string; user: AuthUser } | null
  loading: boolean
  clinicName: string
  clinicLogo: string
  onLogin: (token: string, user: AuthUser) => Promise<void>
  onLogout: () => Promise<void>
  onSettingsSaved: (settings: ClinicSettings) => Promise<void>
}) {
  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#087f8c" /></View>
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Main">
            {() => <MainTabs user={session.user} onLogout={onLogout} onSettingsSaved={onSettingsSaved} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login">
            {() => <LoginScreen clinicName={clinicName} logoDataUrl={clinicLogo} onLogin={onLogin} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7fbfb' },
  scrollTabBar: { height: 76, borderTopWidth: 1, borderTopColor: '#e4eeee', backgroundColor: '#ffffff' },
  scrollTabContent: { paddingHorizontal: 10, alignItems: 'center', gap: 8 },
  scrollTab: { minWidth: 78, height: 60, borderRadius: 14, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  scrollTabActive: { backgroundColor: '#e8f7f5' },
  tabLabel: { fontSize: 10, fontWeight: '700', marginTop: 3 },
  tabIcon: { fontSize: 21, fontWeight: '700' },
  header: { backgroundColor: '#ffffff' },
  headerTitle: { color: '#17323d', fontSize: 16, fontWeight: '800' },
  signOutButton: { borderRadius: 10, backgroundColor: '#fff0f1', paddingHorizontal: 10, paddingVertical: 7, marginRight: 12 },
  signOutText: { color: '#c34b57', fontSize: 11, fontWeight: '800' },
})
