'use client'

import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  variant: ToastVariant
  title: string
  description?: string
  durationMs?: number  // null/0 = sticky
}

interface ToastContextValue {
  notify: (t: Omit<ToastItem, 'id'>) => number
  dismiss: (id: number) => void
  success: (title: string, description?: string, opts?: { durationMs?: number }) => number
  error:   (title: string, description?: string, opts?: { durationMs?: number }) => number
  warning: (title: string, description?: string, opts?: { durationMs?: number }) => number
  info:    (title: string, description?: string, opts?: { durationMs?: number }) => number
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

const VARIANTS: Record<ToastVariant, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: '#ECFDF5', border: '#00A651', color: '#065F46', icon: '✓' },
  error:   { bg: '#FEF2F2', border: '#E8192C', color: '#991B1B', icon: '✗' },
  warning: { bg: '#FFFBEB', border: '#F59E0B', color: '#92400E', icon: '⚠' },
  info:    { bg: '#EFF6FF', border: '#1877F2', color: '#1E40AF', icon: 'ℹ' },
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setItems(curr => curr.filter(i => i.id !== id))
  }, [])

  const notify = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = nextId++
    setItems(curr => [...curr, { ...t, id }])
    const dur = t.durationMs ?? 5000
    if (dur > 0) {
      setTimeout(() => setItems(curr => curr.filter(i => i.id !== id)), dur)
    }
    return id
  }, [])

  const helpers = {
    success: (title: string, description?: string, opts?: any) => notify({ variant: 'success', title, description, ...opts }),
    error:   (title: string, description?: string, opts?: any) => notify({ variant: 'error',   title, description, durationMs: 8000, ...opts }),
    warning: (title: string, description?: string, opts?: any) => notify({ variant: 'warning', title, description, ...opts }),
    info:    (title: string, description?: string, opts?: any) => notify({ variant: 'info',    title, description, ...opts }),
  }

  return (
    <ToastContext.Provider value={{ notify, dismiss, ...helpers }}>
      {children}
      <div style={{
        position: 'fixed',
        top: 20, right: 20,
        zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
        maxWidth: 420, width: 'calc(100% - 40px)',
        pointerEvents: 'none',
      }}>
        <AnimatePresence>
          {items.map(item => {
            const v = VARIANTS[item.variant]
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  pointerEvents: 'auto',
                  background: v.bg,
                  border: `1.5px solid ${v.border}`,
                  borderLeft: `5px solid ${v.border}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  boxShadow: '0 10px 30px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.05)',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  color: v.color,
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: v.border, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, flexShrink: 0,
                }}>{v.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: item.description ? 4 : 0 }}>{item.title}</div>
                  {item.description && <div style={{ fontSize: 12.5, lineHeight: 1.5, opacity: .92 }}>{item.description}</div>}
                </div>
                <button
                  onClick={() => dismiss(item.id)}
                  aria-label="Tutup"
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: v.color, opacity: .6, fontSize: 16, lineHeight: 1, padding: 4,
                  }}
                >×</button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
