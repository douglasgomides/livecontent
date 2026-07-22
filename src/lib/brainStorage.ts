import type { Brain } from '@/types/brain';
import { EMPTY_BRAIN } from '@/types/brain';
import { loadProfile } from './storage';

const BRAIN_KEY = 'cc_brain';

export function loadBrain(): Brain {
  try {
    const raw = localStorage.getItem(BRAIN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return mergeBrain(parsed);
    }
  } catch {}
  // migrate from legacy profile
  const p = loadProfile();
  if (p) {
    const brain: Brain = {
      ...EMPTY_BRAIN,
      doctor: {
        ...EMPTY_BRAIN.doctor,
        name: p.name,
        specialty: p.specialty,
        tone: p.tone,
      },
      patient: {
        ...EMPTY_BRAIN.patient,
        demographic: p.idealPatient,
      },
      onboarded: true,
    };
    saveBrain(brain);
    return brain;
  }
  return EMPTY_BRAIN;
}

function mergeBrain(partial: any): Brain {
  return {
    doctor: { ...EMPTY_BRAIN.doctor, ...(partial?.doctor || {}) },
    patient: { ...EMPTY_BRAIN.patient, ...(partial?.patient || {}) },
    brand: { ...EMPTY_BRAIN.brand, ...(partial?.brand || {}) },
    onboarded: !!partial?.onboarded,
  };
}

export function saveBrain(brain: Brain) {
  localStorage.setItem(BRAIN_KEY, JSON.stringify(brain));
}

const isFilled = (v: any): boolean => {
  if (Array.isArray(v)) return v.filter(Boolean).length > 0;
  if (typeof v === 'string') return v.trim().length > 0;
  return !!v;
};

export function getCompleteness(brain: Brain): { total: number; doctor: number; patient: number; brand: number } {
  const layerPct = (obj: Record<string, any>) => {
    const keys = Object.keys(obj);
    const filled = keys.filter(k => isFilled(obj[k])).length;
    return Math.round((filled / keys.length) * 100);
  };
  const doctor = layerPct(brain.doctor);
  const patient = layerPct(brain.patient);
  const brand = layerPct(brain.brand);
  const total = Math.round((doctor + patient + brand) / 3);
  return { total, doctor, patient, brand };
}
