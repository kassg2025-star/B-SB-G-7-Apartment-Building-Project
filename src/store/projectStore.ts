import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  initialProjectData,
  PRELOAD_SOURCE,
  type DocumentType,
  type NCRRecord,
  type ProjectData,
} from '../data/projectData';

export interface KPISet {
  spi: number;
  cpi: number;
  scheduleVariance: number;
  actualProgress: number;
  plannedProgress: number;
  daysElapsed: number;
  daysRemaining: number;
  eotClaimedDays: number;
  openNcrs: number;
  lti: number;
  ppeCompliance: number;
  contractValue: number;
  totalReceived: number;
}

export interface StoreMeta {
  preloadedAt: string;
  source: string;
  version: string;
  modules: string[];
}

export const STORE_MODULES = [
  'Executive Dashboard',
  'S-Curve Analysis',
  'Delay Analysis',
  'EOT Claim Management',
  'Financial Monitoring',
  'Quality & NCR Tracking',
  'Resource Management',
  'HSE Dashboard',
  'Project Data Center',
  'AI Report Generator',
  'Schedule & Drawings',
  'Risk, Incidents & Problems',
  'Alerts & Notifications',
  'Project Settings',
] as const;

export function computeKPIs(p: ProjectData): KPISet {
  const last = p.progress.monthly[p.progress.monthly.length - 1];
  return {
    spi: p.progress.spi,
    cpi: p.progress.cpi,
    scheduleVariance: last.variance,
    actualProgress: p.progress.currentActual,
    plannedProgress: p.progress.currentPlanned,
    daysElapsed: p.dates.daysElapsed,
    daysRemaining: p.dates.daysRemaining,
    eotClaimedDays: p.eot.claimedDays,
    openNcrs: p.quality.ncrs.filter((n) => n.status === 'Open' || n.status === 'Quarantined').length,
    lti: p.hse.lti,
    ppeCompliance: p.hse.ppeCompliance,
    contractValue: p.financial.originalContractValue,
    totalReceived: p.financial.advancePayment + p.financial.ipc01Certified,
  };
}

interface ProjectStore {
  project: ProjectData;
  meta: StoreMeta;
  selectedReportType: DocumentType;
  setSelectedReportType: (type: DocumentType) => void;
  setProjectFields: (fields: Partial<ProjectData>) => void;
  updateEotStatus: (status: string) => void;
  updateNcrStatus: (id: string, status: NCRRecord['status']) => void;
  resetToPreloaded: () => void;
}

const initialMeta: StoreMeta = {
  preloadedAt: new Date().toISOString(),
  source: PRELOAD_SOURCE,
  version: '1.1.0',
  modules: [...STORE_MODULES],
};

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      project: initialProjectData,
      meta: initialMeta,
      selectedReportType: 'monthly-progress',

      setSelectedReportType: (type) => set({ selectedReportType: type }),

      setProjectFields: (fields) =>
        set((s) => ({ project: { ...s.project, ...fields } })),

      updateEotStatus: (status) =>
        set((s) => ({
          project: { ...s.project, eot: { ...s.project.eot, status } },
        })),

      updateNcrStatus: (id, status) =>
        set((s) => ({
          project: {
            ...s.project,
            quality: {
              ...s.project.quality,
              ncrs: s.project.quality.ncrs.map((n) => (n.id === id ? { ...n, status } : n)),
            },
          },
        })),

      resetToPreloaded: () =>
        set({
          project: initialProjectData,
          meta: {
            ...initialMeta,
            preloadedAt: new Date().toISOString(),
          },
          selectedReportType: 'monthly-progress',
        }),
    }),
    {
      name: 'kassa-pm-store',
      // Only persist the project and selectedReportType — meta is session-only
      partialize: (state) => ({
        project: state.project,
        selectedReportType: state.selectedReportType,
      }),
    }
  )
);

export function useProject(): ProjectData {
  return useProjectStore((s) => s.project);
}

export function useStoreMeta(): StoreMeta {
  return useProjectStore((s) => s.meta);
}

export function useKPIs(): KPISet {
  const project = useProjectStore((s) => s.project);
  return useMemo(() => computeKPIs(project), [project]);
}
