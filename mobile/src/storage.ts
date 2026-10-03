import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthUser } from './types'

const TOKEN_KEY = 'dentahub_token'
const USER_KEY = 'dentahub_user'
const API_BASE_URL_KEY = 'dentahub_api_base_url'

export async function saveSession(token: string, user: AuthUser) {
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, token),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  ])
}

export async function readSession(): Promise<{ token: string; user: AuthUser } | null> {
  const [token, userValue] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(USER_KEY),
  ])
  if (!token || !userValue) return null

  try {
    return { token, user: JSON.parse(userValue) as AuthUser }
  } catch {
    return null
  }
}

export async function clearSession() {
  await Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)])
}

export async function readApiBaseUrl() {
  return AsyncStorage.getItem(API_BASE_URL_KEY)
}

export async function saveApiBaseUrl(value: string | null) {
  if (value) await AsyncStorage.setItem(API_BASE_URL_KEY, value)
  else await AsyncStorage.removeItem(API_BASE_URL_KEY)
}
