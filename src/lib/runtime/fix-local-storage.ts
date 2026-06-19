/**
 * Node.js v25+ can expose a broken globalThis.localStorage (empty object,
 * no getItem) when experimental webstorage is enabled without a valid file path.
 * Next.js dev overlay and Supabase auth then throw on getItem().
 */
export function patchBrokenNodeLocalStorage(): void {
  if (typeof globalThis === 'undefined') return

  const ls = globalThis.localStorage as Storage | undefined
  if (!ls || typeof ls.getItem === 'function') return

  const _store = new Map<string, string>()

  const memStorage: Storage = {
    getItem:    (key) => _store.get(key) ?? null,
    setItem:    (key, val) => { _store.set(key, String(val)) },
    removeItem: (key) => { _store.delete(key) },
    clear:      () => { _store.clear() },
    get length() { return _store.size },
    key:        (index) => [..._store.keys()][index] ?? null,
  }

  let current: Storage = memStorage

  try {
    Object.defineProperty(globalThis, 'localStorage', {
      get:          () => current,
      set:          (incoming: Storage) => {
        if (incoming && typeof incoming.getItem === 'function') current = incoming
      },
      configurable: true,
      enumerable:   false,
    })
  } catch {
    globalThis.localStorage = memStorage
  }
}
