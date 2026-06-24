export interface MonthlyProgress {
  month: string;
  planned: number;
  actual: number;
  variance: number;
  note?: string;
}

export interface QuantityItem {
  item: string;
  unit: string;
  executed: number;
  planned: number | null;
}

export interface Roadblock {
  id: number;
  title: string;
  detail: string;
  delayDays: number;
  category: 'Geological' | 'Mechanical' | 'Logistical' | 'Environmental' | 'Consultant';
}

export interface NCRRecord {
  id: string;
  date: string;
  status: 'Open' | 'Closed' | 'Quarantined';
  item: string;
  batch: string;
  detail: string;
  action: string;
}

export interface MaterialForecast {
  material: string;
  unit: string;
  consumed: number;
  required: number;
  leadTimeDays: number;
  status: 'On Track' | 'At Risk' | 'Critical';
}

export interface CashFlowMonth {
  month: string;
  inflow: number;
  outflow: number;
  cumulative: number;
}

export interface DelayEvent {
  id: string;
  event: string;
  startDate: string;
  endDate: string | null;
  daysClaimed: number;
  category: string;
  status: 'Active' | 'Resolved' | 'Ongoing';
}

export interface ProjectData {
  name: string;
  location: string;
  contractId: string;
  employer: string;
  consultant: string;
  contractor: string;
  projectManager: string;
  dates: {
    contractSigning: string;
    siteCommencement: string;
    originalCompletion: string;
    contractDurationDays: number;
    daysElapsed: number;
    daysRemaining: number;
  };
  financial: {
    originalContractValue: number;
    advancePayment: number;
    ipc01Certified: number;
    ipc02Estimate: number;
    currency: string;
  };
  eot: {
    claimedDays: number;
    status: string;
    revisedCompletionEstimate: string;
    submittedDate: string;
    referenceNo: string;
  };
  progress: {
    status: string;
    spi: number;
    cpi: number;
    monthly: MonthlyProgress[];
    currentActual: number;
    currentPlanned: number;
  };
  excavation: {
    geologicalProfile: string;
    finalDepth: number;
    stabilization: string;
  };
  mayQuantities: QuantityItem[];
  roadblocks: Roadblock[];
  delayEvents: DelayEvent[];
  quality: {
    concrete: string;
    cubeTests: { id: string; result: string; age: string }[];
    ncrs: NCRRecord[];
  };
  resources: {
    workforce: number;
    manDaysMay: number;
    avgDailyWorkers: number;
    payrollMay: number;
    equipment: { name: string; status: string }[];
    materials: MaterialForecast[];
  };
  hse: {
    lti: number;
    nearMiss: number;
    elapsedDays: number;
    ppeCompliance: number;
    incidents: { date: string; type: string; action: string }[];
    inspections: { date: string; score: number; inspector: string }[];
  };
  cashFlow: CashFlowMonth[];
  siteInstructions: { id: string; date: string; subject: string; impact: string }[];
  rebarTests: { diameter: string; result: 'Passed' | 'Failed' }[];
}

/** Canonical preloaded dataset — Kassa & Sons, 4-month consolidated site intelligence */
export const PRELOAD_SOURCE = 'Kassa & Sons Construction PLC — 4-Month Consolidated Site Data (Jan–May 2026)';

export const initialProjectData: ProjectData = {
  name: 'B+SB+G+7 Commercial/Apartment Building Project',
  location: 'Addis Ababa, Ethiopia',
  contractId: 'KAS/AA/YK/2026/002',
  employer: 'Ato Alemu Mamo',
  consultant: 'Adey Engineering One Member PLC',
  contractor: 'Kassa & Sons Construction PLC',
  projectManager: 'Eng. Kasaye Getachew Abebe',
  dates: {
    contractSigning: 'December 23, 2025',
    siteCommencement: 'January 20, 2026',
    originalCompletion: 'January 27, 2027',
    contractDurationDays: 365,
    daysElapsed: 129,
    daysRemaining: 236,
  },
  financial: {
    originalContractValue: 76_881_056.13,
    advancePayment: 15_400_000.0,
    ipc01Certified: 4_196_828.0,
    ipc02Estimate: 1_709_980.0,
    currency: 'ETB',
  },
  eot: {
    claimedDays: 59,
    status: 'Pending Consultant Approval',
    revisedCompletionEstimate: 'March 26, 2027',
    submittedDate: 'June 15, 2026',
    referenceNo: 'KAS/AA/YK/2026/002/EOT/001',
  },
  progress: {
    status: 'At Risk',
    spi: 0.2,
    cpi: 0.85,
    monthly: [
      { month: 'Jan 2026', planned: 4.27, actual: 0.5, variance: -3.77 },
      { month: 'Feb 2026', planned: 13.45, actual: 2.1, variance: -11.35, note: 'Deep earthworks 90% to -6.8m' },
      { month: 'Mar 2026', planned: 23.51, actual: 3.31, variance: -20.2, note: 'Excavation to rock line at -4.8m' },
      { month: 'Apr 2026', planned: 30.28, actual: 5.41, variance: -24.87, note: 'Bulk excavation to -7.55m; F-1 rebar started' },
      { month: 'May 2026', planned: 39.6, actual: 7.86, variance: -31.74, note: 'SPI 0.20' },
    ],
    currentActual: 7.86,
    currentPlanned: 39.6,
  },
  excavation: {
    geologicalProfile:
      '0–4.8m: standard upper soil strata. -4.8m to -7.55m: ultra-hard basaltic rock strata.',
    finalDepth: -7.55,
    stabilization: 'Engineered Soil Nailing protocol (replacing standard perimeter shoring)',
  },
  mayQuantities: [
    { item: 'Bulk Excavation', unit: 'm³', executed: 18, planned: 64 },
    { item: 'Rock Excavation (Chiseling)', unit: 'm³', executed: 210, planned: 350 },
    { item: 'Reinforcement Steel', unit: 'kg', executed: 1632, planned: 5548 },
    { item: 'Foundation Concrete', unit: 'm³', executed: 29.65, planned: 64 },
    { item: 'PCC Blinding', unit: 'm²', executed: 24, planned: 53 },
    { item: 'Formwork', unit: 'm²', executed: 34, planned: 102 },
    { item: 'Rock Spoil Cart-away', unit: 'trips', executed: 15, planned: null },
  ],
  roadblocks: [
    {
      id: 1,
      title: 'Ultra-Dense Rock Strata & Mechanical Failures',
      detail:
        'Deep excavation cycles doubled due to hard rock. Primary excavator hydraulic breakdown; transition to manual chisel sub-contract within narrow pit.',
      delayDays: 22,
      category: 'Geological',
    },
    {
      id: 2,
      title: 'Logistical Spoil Accumulation',
      detail:
        'Mechanical breakdown halted cart-away cycle; rock stockpiles constricted foundation assembly footprint.',
      delayDays: 8,
      category: 'Logistical',
    },
    {
      id: 3,
      title: 'Fuel Supply Stagnation',
      detail: 'Inconsistent diesel supply caused 1–2 total stoppage days per week; restricted machine hours.',
      delayDays: 12,
      category: 'Logistical',
    },
    {
      id: 4,
      title: 'Groundwater Seepage & Heavy Rain',
      detail:
        'Saturated conditions and pit-face collapse (20/05/2026). Three dewatering pumps running 24/7 mandatory.',
      delayDays: 10,
      category: 'Environmental',
    },
    {
      id: 5,
      title: 'Consultant Sequencing Directive (SI-012)',
      detail: 'Site Instruction SI-012 halted concurrent column/shear wall work, widening progress gap.',
      delayDays: 7,
      category: 'Consultant',
    },
  ],
  delayEvents: [
    { id: 'DE-001', event: 'Rock strata encounter at -4.8m', startDate: '2026-02-15', endDate: null, daysClaimed: 22, category: 'Geological', status: 'Ongoing' },
    { id: 'DE-002', event: 'Primary excavator hydraulic failure', startDate: '2026-03-10', endDate: '2026-04-05', daysClaimed: 8, category: 'Mechanical', status: 'Resolved' },
    { id: 'DE-003', event: 'Fuel supply interruptions', startDate: '2026-03-01', endDate: null, daysClaimed: 12, category: 'Logistical', status: 'Active' },
    { id: 'DE-004', event: 'Pit-face collapse & dewatering', startDate: '2026-05-20', endDate: null, daysClaimed: 10, category: 'Environmental', status: 'Active' },
    { id: 'DE-005', event: 'SI-012 sequencing halt', startDate: '2026-04-20', endDate: null, daysClaimed: 7, category: 'Consultant', status: 'Ongoing' },
  ],
  quality: {
    concrete: 'Foundation Pad F-1 (C25/C30): 7-day cube CP-F1-01 passed.',
    cubeTests: [
      { id: 'CP-F1-01', result: 'Passed', age: '7-day' },
      { id: 'CP-F1-02', result: 'Pending', age: '28-day' },
    ],
    ncrs: [
      {
        id: 'NCR-005',
        date: '2026-05-12',
        status: 'Open',
        item: 'Ø20mm Reinforcement Steel',
        batch: 'B-2026-45',
        detail: 'Failed structural tensile strength testing. Batch quarantined on-site.',
        action: 'Alternative mill laboratory re-test pending. Ø20mm assembly frozen.',
      },
      {
        id: 'NCR-003',
        date: '2026-04-08',
        status: 'Closed',
        item: 'PCC Blinding Thickness',
        batch: 'N/A',
        detail: 'Minor thickness deviation at Grid B-3 corrected before pour.',
        action: 'Rework completed and accepted by RE.',
      },
    ],
  },
  resources: {
    workforce: 18,
    manDaysMay: 191.7,
    avgDailyWorkers: 7.3,
    payrollMay: 115_465.0,
    equipment: [
      { name: 'Concrete Vibrator ×2', status: 'Operational' },
      { name: 'Dewatering Pump Array', status: 'Operational — 24/7' },
      { name: 'Total Station', status: 'Operational' },
      { name: 'Primary Excavator', status: 'Breakdown — Hydraulic' },
      { name: 'Manual Chisel Crew', status: 'Active Sub-contract' },
    ],
    materials: [
      { material: 'C25/C30 Concrete', unit: 'm³', consumed: 29.65, required: 64, leadTimeDays: 3, status: 'On Track' },
      { material: 'Rebar Ø8–Ø14mm', unit: 'kg', consumed: 1200, required: 3500, leadTimeDays: 7, status: 'On Track' },
      { material: 'Rebar Ø20mm', unit: 'kg', consumed: 0, required: 2048, leadTimeDays: 14, status: 'Critical' },
      { material: 'PCC Blinding', unit: 'm²', consumed: 24, required: 53, leadTimeDays: 2, status: 'On Track' },
      { material: 'Formwork Plywood', unit: 'm²', consumed: 34, required: 102, leadTimeDays: 5, status: 'At Risk' },
      { material: 'Diesel Fuel', unit: 'L', consumed: 4200, required: 8500, leadTimeDays: 1, status: 'At Risk' },
    ],
  },
  hse: {
    lti: 0,
    nearMiss: 2,
    elapsedDays: 129,
    ppeCompliance: 96,
    incidents: [
      { date: '2026-05-20', type: 'Pit-face soil collapse', action: 'Emergency shoring & night watchmen deployed' },
      { date: '2026-04-15', type: 'Near miss — falling tool', action: 'Toolbox talk & exclusion zone reinforced' },
      { date: '2026-03-22', type: 'Near miss — slip on wet ramp', action: 'Anti-slip mats installed' },
    ],
    inspections: [
      { date: '2026-05-28', score: 96, inspector: 'Site HSE Officer' },
      { date: '2026-04-30', score: 94, inspector: 'Consultant RE' },
      { date: '2026-03-25', score: 92, inspector: 'Site HSE Officer' },
    ],
  },
  cashFlow: [
    { month: 'Jan 2026', inflow: 15_400_000, outflow: 2_100_000, cumulative: 13_300_000 },
    { month: 'Feb 2026', inflow: 0, outflow: 1_850_000, cumulative: 11_450_000 },
    { month: 'Mar 2026', inflow: 0, outflow: 2_200_000, cumulative: 9_250_000 },
    { month: 'Apr 2026', inflow: 4_196_828, outflow: 2_450_000, cumulative: 10_996_828 },
    { month: 'May 2026', inflow: 0, outflow: 2_680_000, cumulative: 8_316_828 },
    { month: 'Jun 2026 (Est.)', inflow: 1_709_980, outflow: 2_900_000, cumulative: 7_126_808 },
  ],
  siteInstructions: [
    {
      id: 'SI-012',
      date: '2026-04-20',
      subject: 'Halt concurrent column/shear wall work during substructure phase',
      impact: 'Widened schedule variance; full compliance documented for EOT entitlement',
    },
  ],
  rebarTests: [
    { diameter: 'Ø8mm', result: 'Passed' },
    { diameter: 'Ø10mm', result: 'Passed' },
    { diameter: 'Ø12mm', result: 'Passed' },
    { diameter: 'Ø14mm', result: 'Passed' },
    { diameter: 'Ø20mm', result: 'Failed' },
  ],
};

export type DocumentType =
  | 'monthly-progress'
  | 'delay-analysis'
  | 'consultant-response'
  | 'client-correspondence'
  | 'eot-claim'
  | 'resource-recovery'
  | 'material-forecast'
  | 'cash-flow-forecast';

export const documentTypes: { id: DocumentType; label: string; description: string }[] = [
  { id: 'monthly-progress', label: 'Monthly Progress Report', description: 'Structural progress & variance analysis' },
  { id: 'delay-analysis', label: 'Delay Analysis Report', description: 'Root cause & entitlement quantification' },
  { id: 'consultant-response', label: 'Consultant Response Letter', description: 'Defensive memo to Adey Engineering' },
  { id: 'client-correspondence', label: 'Client Correspondence', description: 'Formal letter to Ato Alemu Mamo' },
  { id: 'eot-claim', label: 'EOT Claim Submission', description: '59-day extension of time dossier' },
  { id: 'resource-recovery', label: 'Resource Recovery Plan', description: 'Look-ahead & optimization schedule' },
  { id: 'material-forecast', label: 'Material Forecast', description: 'Substructure material requirements & lead times' },
  { id: 'cash-flow-forecast', label: 'Cash Flow Forecast', description: 'Project cash flow projection & IPC pipeline' },
];

export function formatETB(amount: number): string {
  return new Intl.NumberFormat('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function pct(n: number): string {
  return `${n.toFixed(2)}%`;
}

export function execPct(executed: number, planned: number | null): string {
  if (!planned) return '—';
  return `${Math.round((executed / planned) * 100)}%`;
}
