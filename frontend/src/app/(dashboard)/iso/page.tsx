'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ISO_CONTROL_MAPPINGS, CHECKLIST_ITEMS } from '@article30/shared';

type IsoStandard = 'iso27001' | 'iso27701';

const LANG_FR = 'fr';

interface ControlRow {
  control: string;
  checklistItemIds: string[];
}

function buildControlRows(standard: IsoStandard): ControlRow[] {
  const controlMap = new Map<string, Set<string>>();

  for (const mapping of ISO_CONTROL_MAPPINGS) {
    const controls = mapping[standard];
    for (const ctrl of controls) {
      let set = controlMap.get(ctrl);
      if (!set) {
        set = new Set();
        controlMap.set(ctrl, set);
      }
      set.add(mapping.checklistItemId);
    }
  }

  const rows: ControlRow[] = [];
  for (const [control, itemIdSet] of controlMap) {
    rows.push({
      control,
      checklistItemIds: Array.from(itemIdSet),
    });
  }

  rows.sort((a, b) => a.control.localeCompare(b.control));
  return rows;
}

interface IsoTableProps {
  title: string;
  rows: ControlRow[];
  t: (key: string) => string;
  itemLabelMap: Map<string, string>;
}

function IsoTable({ title, rows, t, itemLabelMap }: Readonly<IsoTableProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="overflow-x-auto rounded-lg border"
          style={{ borderColor: 'var(--a30-border)', backgroundColor: 'var(--surface)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b"
                style={{ borderColor: 'var(--a30-border)', backgroundColor: 'var(--surface-2)' }}
              >
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--ink)' }}>
                  {t('iso.control')}
                </th>
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--ink)' }}>
                  {t('iso.checklistItems')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={row.control}
                  className="border-b hover:bg-[var(--surface-2)]"
                  style={{ borderColor: 'var(--a30-border)' }}
                >
                  <td className="px-4 py-3 font-mono text-sm font-medium">{row.control}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--ink)' }}>
                    <div className="flex flex-wrap gap-1">
                      {row.checklistItemIds.map(id => (
                        <Link
                          key={id}
                          href={`/checklist#${id}`}
                          className="inline-block rounded px-2 py-0.5 text-xs transition-colors"
                          style={{
                            backgroundColor: 'var(--surface-2)',
                            color: 'var(--ink)',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = '#e0e7ff';
                            e.currentTarget.style.color = '#4f46e5';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                            e.currentTarget.style.color = 'var(--ink)';
                          }}
                        >
                          {itemLabelMap.get(id) ?? id}
                        </Link>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function IsoReferencePage() {
  const { t, locale } = useI18n();

  const iso27001Rows = useMemo(() => buildControlRows('iso27001'), []);
  const iso27701Rows = useMemo(() => buildControlRows('iso27701'), []);

  const itemLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of CHECKLIST_ITEMS) {
      let label: string;
      if (locale === LANG_FR) {
        label = item.label.fr;
      } else {
        label = item.label.en;
      }
      map.set(item.id, label);
    }
    return map;
  }, [locale]);

  return (
    <div style={{ backgroundColor: 'var(--surface)' }} className="space-y-6 p-6">
      <div className="space-y-6">
        <IsoTable title={t('iso.27001')} rows={iso27001Rows} t={t} itemLabelMap={itemLabelMap} />
        <IsoTable title={t('iso.27701')} rows={iso27701Rows} t={t} itemLabelMap={itemLabelMap} />
      </div>
    </div>
  );
}
