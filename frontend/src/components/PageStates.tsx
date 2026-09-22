import { Loader2, RefreshCw } from 'lucide-react'

export function LoadingState() {
  return <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-soft"><Loader2 className="animate-spin text-teal-600" size={25} /></div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-rose-100 bg-white px-5 text-center shadow-soft"><p className="text-sm font-semibold text-rose-600">{message}</p><button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100"><RefreshCw size={14} /> Try again</button></div>
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-5 text-center"><p className="text-sm font-bold text-ink">{title}</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted">{description}</p></div>
}
