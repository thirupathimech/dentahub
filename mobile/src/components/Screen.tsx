import { PropsWithChildren } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'

export function Screen({ children, scroll = true, refreshing = false, onRefresh }: PropsWithChildren<{ scroll?: boolean; refreshing?: boolean; onRefresh?: () => void }>) {
  const content = <View style={styles.content}>{children}</View>
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
      {scroll ? <ScrollView refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#087f8c" colors={['#087f8c']} /> : undefined} contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </SafeAreaView>
  )
}

export function ScreenTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.titleBlock}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <View style={styles.empty}><Text style={styles.emptyText}>{message}</Text></View>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7fbfb' },
  scroll: { flexGrow: 1 },
  content: { padding: 20, paddingBottom: 32 },
  titleBlock: { marginBottom: 22 },
  eyebrow: { color: '#087f8c', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  title: { color: '#17323d', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#71838e', fontSize: 14, marginTop: 7, lineHeight: 20 },
  empty: { padding: 24, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4eeee', alignItems: 'center' },
  emptyText: { color: '#71838e', fontSize: 14 },
})
