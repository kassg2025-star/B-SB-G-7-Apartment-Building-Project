import {
  formatETB,
  pct,
  type DocumentType,
  type ProjectData,
} from '../data/projectData';

const today = () =>
  new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// ── All helpers receive `project` as a parameter — no free-variable references ──

function header(p: ProjectData, ref: string, to: string, subject: string): string {
  return `KASSA & SONS CONSTRUCTION PLC
Addis Ababa, Ethiopia
Ref: ${ref}
Date: ${today()}

To:      ${to}
From:    ${p.projectManager}
          Project Manager — ${p.contractor}
Project: ${p.name}
Contract: ${p.contractId}

SUBJECT: ${subject}

`;
}

function roadblockBlock(p: ProjectData): string {
  return p.roadblocks
    .map((r, i) => `${i + 1}. ${r.title} [${r.category} — +${r.delayDays} days]\n   ${r.detail}`)
    .join('\n\n');
}

function progressTable(p: ProjectData): string {
  return p.progress.monthly
    .map(
      (m) =>
        `${m.month.padEnd(12)} | Planned: ${pct(m.planned).padEnd(8)} | Actual: ${pct(m.actual).padEnd(8)} | Variance: ${pct(m.variance)}`
    )
    .join('\n');
}

function mayQuantitiesBlock(p: ProjectData): string {
  return p.mayQuantities
    .map((q) => {
      const planned = q.planned != null ? `${q.planned} ${q.unit}` : 'N/A';
      return `• ${q.item}: ${q.executed} ${q.unit} executed (planned: ${planned})`;
    })
    .join('\n');
}

function delayEventsBlock(p: ProjectData): string {
  return p.delayEvents
    .map((e) => `• ${e.id}: ${e.event} | ${e.startDate} — ${e.endDate ?? 'Ongoing'} | +${e.daysClaimed} days | ${e.status}`)
    .join('\n');
}

function materialsBlock(p: ProjectData): string {
  return p.resources.materials
    .map(
      (m) =>
        `• ${m.material}: ${m.consumed}/${m.required} ${m.unit} | Lead: ${m.leadTimeDays}d | ${m.status}`
    )
    .join('\n');
}

function cashFlowBlock(p: ProjectData): string {
  return p.cashFlow
    .map((c) => `${c.month.padEnd(18)} | In: ${formatETB(c.inflow).padStart(14)} | Out: ${formatETB(c.outflow).padStart(12)} | Cum: ${formatETB(c.cumulative)}`)
    .join('\n');
}

export function generateDocument(type: DocumentType, project: ProjectData): string {
  const lastMonth = project.progress.monthly[project.progress.monthly.length - 1];

  switch (type) {
    case 'monthly-progress':
      return `${header(
        project,
        `${project.contractId}/PR/MAY-2026`,
        `${project.consultant} & ${project.employer}`,
        'MONTHLY STRUCTURAL PROGRESS REPORT — MAY 2026'
      )}REPORTING PERIOD: May 2026
PREPARED BY: ${project.projectManager}

1. EXECUTIVE SUMMARY
Cumulative progress: ${pct(project.progress.currentActual)} (planned: ${pct(project.progress.currentPlanned)}).
Variance: ${pct(lastMonth.variance)}. Status: ${project.progress.status}. SPI: ${project.progress.spi}.

2. S-CURVE ANALYSIS
${progressTable(project)}

3. SUBSTRUCTURE ENGINEERING
Depth: ${project.excavation.finalDepth}m BGL | ${project.excavation.geologicalProfile}
Stabilization: ${project.excavation.stabilization}

4. MAY 2026 QUANTITIES
${mayQuantitiesBlock(project)}

5. DISRUPTION LOG
${roadblockBlock(project)}

6. QUALITY
${project.quality.concrete}
${project.quality.ncrs[0].id} (${project.quality.ncrs[0].status}): ${project.quality.ncrs[0].detail}

7. RESOURCES & HSE
Workforce: ${project.resources.workforce} | Man-days: ${project.resources.manDaysMay} | Payroll: ${formatETB(project.resources.payrollMay)} ETB
HSE: ${project.hse.lti} LTI | PPE ${project.hse.ppeCompliance}%

8. EOT STATUS
${project.eot.claimedDays}-day claim (${project.eot.status}) — Ref ${project.eot.referenceNo}

${project.projectManager}
Project Manager`;

    case 'delay-analysis':
      return `${header(
        project,
        `${project.contractId}/DA/001`,
        `${project.consultant} — Copy: ${project.employer}`,
        'DELAY ANALYSIS REPORT — SUBSTRUCTURE PHASE ENTITLEMENT'
      )}1. PURPOSE
Quantify schedule delay attributable to site conditions beyond Contractor control and substantiate the ${project.eot.claimedDays}-day EOT claim.

2. BASELINE POSITION
Elapsed: ${project.dates.daysElapsed} days | Remaining: ${project.dates.daysRemaining} days
SPI: ${project.progress.spi} | Cumulative variance: ${pct(lastMonth.variance)}

3. S-CURVE VARIANCE
${progressTable(project)}

4. DELAY EVENT REGISTER
${delayEventsBlock(project)}

5. ROOT CAUSE — PERSISTENT DISRUPTIONS
${roadblockBlock(project)}

Total event days logged: ${project.delayEvents.reduce((s, e) => s + e.daysClaimed, 0)}
EOT claimed: ${project.eot.claimedDays} calendar days

6. PRODUCTIVITY EVIDENCE (MAY 2026)
${mayQuantitiesBlock(project)}

7. CONTRACTUAL POSITION
Delays are not attributable to Contractor inefficiency. All contractual rights regarding EOT and prolongation are reserved.

${project.projectManager}
Project Manager`;

    case 'consultant-response':
      return `${header(
        project,
        `${project.contractId}/CM/001`,
        `${project.consultant} — Attn: Resident Engineer`,
        'RESPONSE MEMORANDUM — SCHEDULE VARIANCE, SI-012 & EOT ENTITLEMENT'
      )}1. REFERENCE
This memorandum addresses programme reviews and SI-012 impact while preserving the Contractor's position on the ${project.eot.claimedDays}-day EOT claim (${project.eot.referenceNo}).

2. SCHEDULE POSITION
${progressTable(project)}
May 2026 SPI: ${project.progress.spi}

3. SI-012 IMPACT
Sequencing directive halting concurrent column/shear wall work, issued under existing geological and logistical constraints, widened variance to ${pct(lastMonth.variance)}. Compliance does not constitute acceptance of time liability.

4. ENTITLEMENT
${roadblockBlock(project)}

5. NCR-005
${project.quality.ncrs[0].id} — Batch ${project.quality.ncrs[0].batch} quarantined. Quality hold must not be allocated as Contractor delay.

6. HSE
${project.hse.lti} LTIs in ${project.hse.elapsedDays} days. Post-collapse measures (20/05/2026) implemented immediately.

7. RESERVATION
All rights under the Contract regarding EOT and dispute resolution are expressly reserved.

${project.projectManager}
Project Manager`;

    case 'client-correspondence':
      return `${header(
        project,
        `${project.contractId}/CL/001`,
        `${project.employer} (Employer)`,
        'PROJECT STATUS UPDATE & REQUEST FOR EOT CONSIDERATION'
      )}Dear ${project.employer},

We respectfully update you on Contract ${project.contractId} and seek your support for the pending ${project.eot.claimedDays}-day EOT claim under consultant review.

1. STATUS
After ${project.dates.daysElapsed} days, progress is ${pct(project.progress.currentActual)} against planned ${pct(project.progress.currentPlanned)} (${pct(lastMonth.variance)} variance). Classification: ${project.progress.status}.

2. CHALLENGES
${roadblockBlock(project)}

3. ACHIEVEMENTS
• Excavation to ${project.excavation.finalDepth}m BGL through basaltic rock
• Foundation F-1 concrete verified (CP-F1-01 passed)
• ${project.hse.lti} LTIs over ${project.hse.elapsedDays} days (${project.hse.ppeCompliance}% PPE)

4. FINANCIAL TRANSPARENCY
Contract: ${formatETB(project.financial.originalContractValue)} ETB
Advance: ${formatETB(project.financial.advancePayment)} ETB | IPC-01 Paid: ${formatETB(project.financial.ipc01Certified)} ETB
IPC-02 Estimate: ${formatETB(project.financial.ipc02Estimate)} ETB

5. REQUEST
Endorsement of the ${project.eot.claimedDays}-day EOT claim to enable substructure recovery without penalising the Contractor for unforeseeable ground conditions.

Yours faithfully,
${project.projectManager}
Project Manager`;

    case 'eot-claim':
      return `${header(
        project,
        project.eot.referenceNo,
        `${project.consultant} (Consultant) — Copy: ${project.employer}`,
        `FORMAL CLAIM FOR EXTENSION OF TIME — ${project.eot.claimedDays} CALENDAR DAYS`
      )}Submitted: ${project.eot.submittedDate}

1. RELIEF SOUGHT
${project.eot.claimedDays} calendar days EOT. Revised completion: ${project.eot.revisedCompletionEstimate}.

2. DELAY EVENTS
${delayEventsBlock(project)}

3. ROOT CAUSES
${roadblockBlock(project)}

4. SCHEDULE ANALYSIS
${progressTable(project)}

5. MITIGATION
• Manual chisel crew | Soil Nailing | 24/7 dewatering (3 pumps)
• Emergency shoring post 20/05/2026 | SI-012 compliance | CP-F1-01 passed

6. SUPPORTING RECORDS
Site diaries, machine logs, spoil trip records (15 May), NCR-005, SI-012, cube test CP-F1-01

Respectfully submitted,
${project.projectManager}
Project Manager`;

    case 'resource-recovery':
      return `${header(
        project,
        `${project.contractId}/RRP/001`,
        'Site Management Team',
        'RESOURCE RECOVERY PLAN — JUNE 2026 LOOK-AHEAD'
      )}OBJECTIVE: Recover substructure float while maintaining HSE and NCR-005 protocols.

BASELINE: ${project.dates.daysRemaining} days remaining | Variance ${pct(lastMonth.variance)} | EOT ${project.eot.claimedDays}d pending

WEEK 1–2: EXCAVATION & SPOIL
• Complete bulk excavation balance (${(project.mayQuantities[0].planned ?? 0) - project.mayQuantities[0].executed} m³)
• Rock chiseling ≥40 m³/week | 2 tipper trips/day minimum
• 3-pump dewatering 24/7 | Daily pit-face inspection

WEEK 2–3: FOUNDATION F-1
• PCC blinding: ${(project.mayQuantities[4].planned ?? 0) - project.mayQuantities[4].executed} m² remaining
• Rebar 1,200 kg/week (Ø8–Ø14mm only until NCR-005 closed)
• Formwork 35 m²/week | Pour Tue/Thu

WEEK 3–4: QUALITY & COMPLIANCE
• Expedite Ø20mm Batch B-2026-45 re-test
• Document fuel interruptions for EOT
• Weekly progress to Consultant every Friday 16:00

RESOURCES: Min ${project.resources.workforce} workers | 1 dedicated vibrator | Night watchmen continue

${project.projectManager}
Project Manager`;

    case 'material-forecast':
      return `${header(
        project,
        `${project.contractId}/MF/001`,
        'Procurement & Site Management',
        'MATERIAL FORECAST — SUBSTRUCTURE PHASE (JUN–AUG 2026)'
      )}1. CURRENT CONSUMPTION & REQUIREMENTS
${materialsBlock(project)}

2. CRITICAL ITEM — Ø20mm REINFORCEMENT
Batch B-2026-45 quarantined under ${project.quality.ncrs[0].id}. Zero Ø20mm installation until NCR closure.
Required balance: ${project.resources.materials[2].required - project.resources.materials[2].consumed} kg | Lead: ${project.resources.materials[2].leadTimeDays} days

3. CONCRETE (C25/C30)
Consumed: ${project.resources.materials[0].consumed} m³ | Required: ${project.resources.materials[0].required} m³
Lead time: ${project.resources.materials[0].leadTimeDays} days | Status: ${project.resources.materials[0].status}

4. FORMWORK & PCC
Formwork plywood: ${project.resources.materials[4].consumed}/${project.resources.materials[4].required} m² — ${project.resources.materials[4].status}
PCC blinding: ${project.resources.materials[3].consumed}/${project.resources.materials[3].required} m²

5. FUEL
Diesel consumed: ${project.resources.materials[5].consumed} L | Forecast: ${project.resources.materials[5].required} L
Status: ${project.resources.materials[5].status} — supply interruptions documented for EOT

6. PROCUREMENT ACTIONS
• Secure alternative Ø20mm mill certification urgently
• Pre-order formwork for Phase 2 pads
• Establish 5-day diesel buffer stock

${project.projectManager}
Project Manager`;

    case 'cash-flow-forecast':
      return `${header(
        project,
        `${project.contractId}/CF/001`,
        `${project.employer} & ${project.consultant} — Finance Review`,
        'CASH FLOW FORECAST — JAN TO DEC 2026'
      )}1. CONTRACT FINANCIALS
Original Value: ${formatETB(project.financial.originalContractValue)} ETB
Advance Received: ${formatETB(project.financial.advancePayment)} ETB
IPC-01 Paid: ${formatETB(project.financial.ipc01Certified)} ETB
IPC-02 Pending: ${formatETB(project.financial.ipc02Estimate)} ETB

2. HISTORICAL CASH FLOW (JAN–JUN 2026)
${cashFlowBlock(project)}

3. FORECAST ASSUMPTIONS
• IPC-02 certification expected July 2026: ${formatETB(project.financial.ipc02Estimate)} ETB
• Monthly site outflow: ETB 2.5M–2.9M (workforce, plant, materials, sub-contract chisel crew)
• EOT approval may defer milestone payments — no liability accepted by Contractor

4. MAY 2026 COST BREAKDOWN
Payroll: ${formatETB(project.resources.payrollMay)} ETB
Man-days: ${project.resources.manDaysMay} | Avg workers: ${project.resources.avgDailyWorkers}

5. RECOMMENDATIONS
• Expedite IPC-02 certification to maintain positive cumulative position
• Advance material procurement for recovery phase upon EOT approval
• Monitor diesel cost escalation tied to supply disruptions

${project.projectManager}
Project Manager`;

    default:
      return '';
  }
}

export const systemPrompt = (project: ProjectData) =>
  `Expert AI Construction PM & Claims Engineer — Ethiopian sector. Primary intelligence tool for ${project.projectManager}, ${project.contractor}, Contract ${project.contractId}. Protect the ${project.eot.claimedDays}-day EOT claim. Factual, professional, contractually bulletproof tone.`;
