export interface IsoControlMapping {
  checklistItemId: string;
  iso27001: string[]; // e.g. ['A.5.1', 'A.5.2']
  iso27701: string[]; // e.g. ['6.2.1.1']
}

export const ISO_CONTROL_MAPPINGS: readonly IsoControlMapping[] = [
  { checklistItemId: 'art5-lawfulness', iso27001: ['A.5.1'], iso27701: ['6.2.1.1'] },
  { checklistItemId: 'art5-purpose', iso27001: ['A.5.1'], iso27701: ['6.2.1.1'] },
  { checklistItemId: 'art5-minimisation', iso27001: ['A.8.1'], iso27701: ['7.4.1'] },
  { checklistItemId: 'art5-accuracy', iso27001: ['A.8.1'], iso27701: ['7.4.3'] },
  { checklistItemId: 'art5-retention', iso27001: ['A.8.1'], iso27701: ['7.4.4'] },
  { checklistItemId: 'art5-integrity', iso27001: ['A.8.1', 'A.8.2'], iso27701: ['6.2.1.1'] },
  { checklistItemId: 'art6-legal-basis', iso27001: [], iso27701: ['7.2.2'] },
  { checklistItemId: 'art6-consent', iso27001: [], iso27701: ['7.2.3', '7.2.4'] },
  { checklistItemId: 'art12-transparency', iso27001: [], iso27701: ['7.3.2'] },
  { checklistItemId: 'art15-access', iso27001: [], iso27701: ['7.3.3'] },
  { checklistItemId: 'art16-rectification', iso27001: [], iso27701: ['7.3.4'] },
  { checklistItemId: 'art17-erasure', iso27001: [], iso27701: ['7.3.5'] },
  { checklistItemId: 'art18-restriction', iso27001: [], iso27701: ['7.3.6'] },
  { checklistItemId: 'art20-portability', iso27001: [], iso27701: ['7.3.7'] },
  { checklistItemId: 'art21-object', iso27001: [], iso27701: ['7.3.8'] },
  { checklistItemId: 'art22-automated', iso27001: [], iso27701: ['7.3.9'] },
  {
    checklistItemId: 'art32-security',
    iso27001: ['A.5.1', 'A.8.1', 'A.8.2'],
    iso27701: ['6.2.1.1'],
  },
  { checklistItemId: 'art32-encryption', iso27001: ['A.8.3'], iso27701: ['6.2.1.1'] },
  {
    checklistItemId: 'art32-incident',
    iso27001: ['A.5.24', 'A.5.25', 'A.5.26'],
    iso27701: ['6.2.1.1'],
  },
  { checklistItemId: 'art33-breach', iso27001: ['A.5.24', 'A.6.8'], iso27701: ['6.13.1.1'] },
  { checklistItemId: 'art34-communication', iso27001: ['A.5.24'], iso27701: ['6.13.1.5'] },
  { checklistItemId: 'art25-design', iso27001: ['A.8.1'], iso27701: ['7.4.1', '7.4.2'] },
  { checklistItemId: 'art25-default', iso27001: ['A.8.1'], iso27701: ['7.4.5'] },
  { checklistItemId: 'art35-dpia', iso27001: ['A.5.8'], iso27701: ['7.2.5'] },
  { checklistItemId: 'art28-dpa', iso27001: ['A.5.19', 'A.5.20'], iso27701: ['7.5.1'] },
  { checklistItemId: 'art28-subprocessor', iso27001: ['A.5.21'], iso27701: ['7.5.1'] },
  { checklistItemId: 'art26-joint', iso27001: ['A.5.19'], iso27701: ['7.2.7'] },
  { checklistItemId: 'art27-representative', iso27001: [], iso27701: ['7.2.8'] },
  { checklistItemId: 'art37-designation', iso27001: ['A.5.2'], iso27701: ['6.3.1.1'] },
  { checklistItemId: 'art38-position', iso27001: ['A.5.2'], iso27701: ['6.3.1.1'] },
  { checklistItemId: 'art39-tasks', iso27001: ['A.5.2'], iso27701: ['6.3.1.1'] },
  { checklistItemId: 'art44-principle', iso27001: [], iso27701: ['7.5.2'] },
  { checklistItemId: 'art46-safeguards', iso27001: [], iso27701: ['7.5.2'] },
  { checklistItemId: 'art49-derogations', iso27001: [], iso27701: ['7.5.2'] },
  { checklistItemId: 'art30-records', iso27001: ['A.5.1'], iso27701: ['7.2.8'] },
  {
    checklistItemId: 'art24-accountability',
    iso27001: ['A.5.1', 'A.5.36'],
    iso27701: ['6.2.1.1'],
  },
  { checklistItemId: 'art5-2-demonstrate', iso27001: ['A.5.36'], iso27701: ['6.2.1.1'] },
  { checklistItemId: 'art9-sensitive', iso27001: ['A.5.12'], iso27701: ['7.2.10'] },
  { checklistItemId: 'art10-criminal', iso27001: [], iso27701: ['7.2.10'] },
] as const;
