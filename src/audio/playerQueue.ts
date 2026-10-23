/** Pure queue math for the ambient player. `order` holds queue indices in play order. */

export function makeOrder(
  length: number,
  startIndex: number,
  shuffle: boolean,
  rng: () => number = Math.random,
): number[] {
  const order = Array.from({ length }, (_, i) => i)
  if (!shuffle) return order
  const rest = order.filter((i) => i !== startIndex)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return length ? [startIndex, ...rest] : []
}

/** Next position in `order`, or null when the queue ends and repeat is off. */
export function nextPos(pos: number, length: number, repeat: boolean): number | null {
  if (pos + 1 < length) return pos + 1
  return repeat && length > 0 ? 0 : null
}

/** Previous position; at the start it wraps with repeat, otherwise stays on the first track. */
export function prevPos(pos: number, length: number, repeat: boolean): number {
  if (pos > 0) return pos - 1
  return repeat && length > 0 ? length - 1 : 0
}
