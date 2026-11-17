/**
 * Унікальний id. crypto.randomUUID є лише в secure context (HTTPS/localhost),
 * а по http://192.168.x.x під час розробки його немає — тому є запасний варіант.
 */
export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}
