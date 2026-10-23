import { useCallback, useRef } from 'react'

/** Calls `onTrigger` after `count` taps within `windowMs` of the first one (hidden gestures). */
export function useTapSequence(
  count: number,
  windowMs: number,
  onTrigger: () => void,
  now: () => number = Date.now,
) {
  const taps = useRef<number[]>([])
  return useCallback(() => {
    const t = now()
    taps.current = [...taps.current.filter((x) => t - x <= windowMs), t]
    if (taps.current.length >= count) {
      taps.current = []
      onTrigger()
    }
  }, [count, windowMs, onTrigger, now])
}
