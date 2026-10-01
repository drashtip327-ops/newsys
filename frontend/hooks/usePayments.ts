'use client';
import { useEffect, useRef, useState } from 'react';
import type { AppState } from '../types/payment';
import { createSeedState } from '../lib/payments';
import { loadState, saveState } from '../lib/storage';
import { getSeed } from '../lib/payments-api';
import { isAppState } from '../lib/payments';

export function usePayments() {
  const [state, setState] = useState<AppState | null>(null);
  const current = useRef<AppState | null>(null);
  const [warning, setWarning] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => {
    let result;
    try { result = loadState(window.localStorage); }
    catch { result = { state: createSeedState(), warning: 'Browser storage is unavailable. Changes will last only until this page is closed.' }; }
    current.current = result.state;
    // Browser storage must be read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(result.state);
    setWarning(result.warning);
  }, []);
  async function commit(operation: (previous: AppState) => Promise<AppState>) {
    if (!current.current) throw new Error('Payments are still loading.');
    if (inFlight.current) throw new Error('Please wait for the current payment action to finish.');
    inFlight.current = true;
    setBusy(true);
    try {
      const next = await operation(current.current);
      if (!isAppState(next)) throw new Error('The backend returned an invalid response. No changes were saved.');
      current.current = next;
      setState(next);
      try { saveState(window.localStorage, next); setWarning(''); }
      catch { setWarning('Changes are shown, but could not be saved to browser storage. Keep this page open to avoid losing them.'); }
    } finally { inFlight.current = false; setBusy(false); }
  }
  return { state, warning, busy, commit, reset: () => commit(getSeed) };
}
