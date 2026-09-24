import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

export type AutocompleteOption = { value: string; label: string; description?: string }

export default function AutocompleteField({ label, value, onChange, options, required = false, placeholder = 'Search and select' }: { label: string; value: string; onChange: (value: string) => void; options: AutocompleteOption[]; required?: boolean; placeholder?: string }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const previousValue = useRef<string | undefined>(undefined)
  const skipBlur = useRef(false)

  const displayLabel = (option: AutocompleteOption) => {
    if (option.description) return `${option.label} · ${option.description}`
    const duplicate = options.filter((candidate) => candidate.label.trim().toLowerCase() === option.label.trim().toLowerCase()).length > 1
    return duplicate ? `${option.label} · ID #${option.value}` : option.label
  }

  useEffect(() => {
    const selected = options.find((option) => option.value && option.value === value)
    const selectedLabel = selected ? displayLabel(selected) : ''
    // Parent forms recreate the options array while the user types. Only sync
    // the visible value when the selected ID changes, not on every keystroke.
    if (value !== previousValue.current || (value && selectedLabel && query !== selectedLabel)) setQuery(selectedLabel)
    previousValue.current = value
  }, [options, value, query])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const selectableOptions = options.filter((option) => option.value)
    return normalized ? selectableOptions.filter((option) => displayLabel(option).toLowerCase().includes(normalized)) : selectableOptions
  }, [options, query])

  const choose = (option: AutocompleteOption) => {
    setQuery(displayLabel(option))
    onChange(option.value)
    setOpen(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && open && filtered[0]) {
      event.preventDefault()
      skipBlur.current = true
      choose(filtered[0])
    }
    if (event.key === 'Escape') setOpen(false)
  }

  return <div className="relative"><label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}{required && <span className="text-coral"> *</span>}</span><span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10"><Search size={15} className="shrink-0 text-muted" /><input required={required} value={query} placeholder={placeholder} autoComplete="off" onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => { setOpen(false); if (skipBlur.current) { skipBlur.current = false; return } if (!value) setQuery('') }, 120)} onKeyDown={handleKeyDown} onChange={(event) => { skipBlur.current = false; setQuery(event.target.value); onChange(''); setOpen(true) }} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /><ChevronDown size={15} className={`shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} /></span></label>{open && <div className="autocomplete-menu absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">{filtered.length === 0 ? <p className="px-3 py-3 text-xs font-semibold text-muted">No matching {label.toLowerCase()} found.</p> : filtered.map((option) => <button key={option.value} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { skipBlur.current = true; choose(option) }} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-ink transition hover:bg-teal-50 hover:text-teal-700"><span className="min-w-0"><span className="block truncate">{option.label}</span>{option.description && <span className="mt-0.5 block truncate text-[10px] font-medium text-muted">{option.description}</span>}</span>{option.value === value && <Check size={15} className="shrink-0 text-teal-600" />}</button>)}</div>}</div>
}
