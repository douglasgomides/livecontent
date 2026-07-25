/**
 * brainStorage.ts — Fachada sobre o store para o Brain (3 camadas).
 * Leituras síncronas do cache; escritas persistem no Postgres.
 */
import type { Brain } from '@/types/brain';
import { EMPTY_BRAIN } from '@/types/brain';
import {
  getBrain,
  saveBrain as storeSaveBrain,
  useStoreVersion,
} from './store';

export function loadBrain(): Brain {
  return getBrain();
}

export function saveBrain(brain: Brain) {
  void storeSaveBrain(brain);
}

export function useBrain(): Brain {
  useStoreVersion();
  return getBrain();
}

const isFilled = (v: any): boolean => {
  if (Array.isArray(v)) return v.filter(Boolean).length > 0;
  if (typeof v === 'string') return v.trim().length > 0;
  return !!v;
};

export function getCompleteness(brain: Brain): { total: number; doctor: number; patient: number; brand: number } {
  const layerPct = (obj: Record<string, any>) => {
    const keys = Object.keys(obj);
    if (!keys.length) return 0;
    const filled = keys.filter(k => isFilled(obj[k])).length;
    return Math.round((filled / keys.length) * 100);
  };
  const doctor = layerPct(brain.doctor);
  const patient = layerPct(brain.patient);
  const brand = layerPct(brain.brand);
  const total = Math.round((doctor + patient + brand) / 3);
  return { total, doctor, patient, brand };
}

export { EMPTY_BRAIN };
