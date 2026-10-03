import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function timeKey(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
}

function parseValue(value: string, mode: 'date' | 'time') {
  if (!value) return new Date()
  if (mode === 'date') return new Date(`${value}T00:00:00`)
  const [hours, minutes] = value.split(':').map(Number)
  const date = new Date()
  date.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0)
  return date
}

export default function DateTimeField({ label, value, mode = 'date', placeholder = 'Choose date', onChange }: { label?: string; value: string; mode?: 'date' | 'time'; placeholder?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false)
    if (event.type === 'set' && selected) onChange(mode === 'date' ? dateKey(selected) : timeKey(selected))
  }
  return <>
    <TouchableOpacity style={styles.field} onPress={() => setOpen(true)}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Text style={[styles.value, !value && styles.placeholder]}>{value || placeholder}</Text>
    </TouchableOpacity>
    {open ? <DateTimePicker value={parseValue(value, mode)} mode={mode} is24Hour={mode === 'time'} onChange={handleChange} /> : null}
  </>
}

const styles = StyleSheet.create({
  field: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: '#d8e5e6', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 8, justifyContent: 'center', backgroundColor: '#ffffff' },
  label: { color: '#47606b', fontSize: 10, fontWeight: '700', marginBottom: 2 },
  value: { color: '#17323d', fontSize: 13 },
  placeholder: { color: '#9aaab2' },
})
