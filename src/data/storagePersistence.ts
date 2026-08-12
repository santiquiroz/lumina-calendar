export type PersistenceState = 'persistente' | 'temporal' | 'no-soportado';

export async function currentPersistence(): Promise<PersistenceState> {
  if (!navigator.storage?.persisted) return 'no-soportado';
  return (await navigator.storage.persisted()) ? 'persistente' : 'temporal';
}

export async function requestPersistentStorage(): Promise<PersistenceState> {
  if (!navigator.storage?.persist) return 'no-soportado';
  return (await navigator.storage.persist()) ? 'persistente' : 'temporal';
}
