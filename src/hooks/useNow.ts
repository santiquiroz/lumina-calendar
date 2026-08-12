import { useEffect, useState } from 'react';

export function useNow(intervalMs = 30_000): Date {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return ahora;
}
