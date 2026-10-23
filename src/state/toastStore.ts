import { create } from 'zustand'

export interface ToastItem {
  id: number
  message: string
  kind: 'info' | 'warn' | 'error'
}

interface ToastState {
  toasts: ToastItem[]
  push: (message: string, kind?: ToastItem['kind'], ttlMs?: number) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, kind = 'info', ttlMs = 4000) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }))
    if (ttlMs > 0) setTimeout(() => get().dismiss(id), ttlMs)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (m: string, kind?: ToastItem['kind']) => useToastStore.getState().push(m, kind)
