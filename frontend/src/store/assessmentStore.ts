import { create } from 'zustand';
import axios from 'axios';

interface AssessmentPreGenState {
  /** Pre-generation status per candidate ID */
  preGenStatus: Record<number, 'idle' | 'generating' | 'ready' | 'error'>;
  /** Assessment ID once generated */
  assessmentIds: Record<number, number>;

  /** Trigger pre-generation for a candidate. Fire-and-forget. */
  triggerPreGenerate: (candidateId: number) => void;

  /** Poll the status of pre-generation */
  pollStatus: (candidateId: number) => Promise<{ ready: boolean; assessmentId?: number }>;

  /** Set status directly (e.g., when verify response includes assessmentId) */
  setReady: (candidateId: number, assessmentId: number) => void;
}

export const useAssessmentStore = create<AssessmentPreGenState>((set, get) => ({
  preGenStatus: {},
  assessmentIds: {},

  triggerPreGenerate: (candidateId) => {
    const current = get().preGenStatus[candidateId];
    if (current === 'generating' || current === 'ready') return;

    set((state) => ({
      preGenStatus: { ...state.preGenStatus, [candidateId]: 'generating' },
    }));

    axios
      .post(`/api/assessment/pre-generate/${candidateId}`)
      .then((res) => {
        if (res.data.assessmentId) {
          set((state) => ({
            preGenStatus: { ...state.preGenStatus, [candidateId]: 'ready' },
            assessmentIds: { ...state.assessmentIds, [candidateId]: res.data.assessmentId },
          }));
        }
        // If preGenerating=true, status stays 'generating' — caller should poll
      })
      .catch(() => {
        set((state) => ({
          preGenStatus: { ...state.preGenStatus, [candidateId]: 'error' },
        }));
      });
  },

  pollStatus: async (candidateId) => {
    try {
      const res = await axios.get(`/api/assessment/pre-generate/${candidateId}/status`);
      if (res.data.ready && res.data.assessmentId) {
        set((state) => ({
          preGenStatus: { ...state.preGenStatus, [candidateId]: 'ready' },
          assessmentIds: { ...state.assessmentIds, [candidateId]: res.data.assessmentId },
        }));
        return { ready: true, assessmentId: res.data.assessmentId };
      }
      return { ready: false };
    } catch {
      return { ready: false };
    }
  },

  setReady: (candidateId, assessmentId) => {
    set((state) => ({
      preGenStatus: { ...state.preGenStatus, [candidateId]: 'ready' },
      assessmentIds: { ...state.assessmentIds, [candidateId]: assessmentId },
    }));
  },
}));
