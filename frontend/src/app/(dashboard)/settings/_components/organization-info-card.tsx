'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OrgForm } from './types';

type OrganizationInfoCardProps = Readonly<{
  form: OrgForm;
  fields: { key: keyof OrgForm; label: string }[];
  message: string | null;
  messageClass: string;
  saving: boolean;
  saveLabel: string;
  title: string;
  annualTurnoverLabel: string;
  annualTurnoverHint: string;
  onChange: (field: keyof OrgForm) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnnualTurnoverChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}>;

export function OrganizationInfoCard({
  form,
  fields,
  message,
  messageClass,
  saving,
  saveLabel,
  title,
  annualTurnoverLabel,
  annualTurnoverHint,
  onChange,
  onAnnualTurnoverChange,
  onSave,
}: OrganizationInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fields.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input id={key} value={form[key]} onChange={onChange(key)} />
            </div>
          ))}

          <div>
            <Label>{annualTurnoverLabel}</Label>
            <Input
              type="number"
              value={form.annualTurnover}
              onChange={onAnnualTurnoverChange}
              placeholder="0"
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>
              {annualTurnoverHint}
            </p>
          </div>

          {message && <p className={`text-sm ${messageClass}`}>{message}</p>}

          <Button onClick={onSave} disabled={saving}>
            {saveLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
