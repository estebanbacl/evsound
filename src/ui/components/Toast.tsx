import { useToastStore } from '../../state/toastStore'

export function ToastHost() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="ev-toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} className={`ev-toast is-${t.kind}`} onClick={() => dismiss(t.id)}>
          {t.message}
        </button>
      ))}
    </div>
  )
}
