'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type GovernanceCardProps = Readonly<{
  enforceSeparationOfDuties: boolean;
  message: string | null;
  messageClass: string;
  saving: boolean;
  saveLabel: string;
  title: string;
  description: string;
  separationLabel: string;
  separationHint: string;
  separationOffWarning: string;
  onToggle: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}>;

export function GovernanceCard({
  enforceSeparationOfDuties,
  message,
  messageClass,
  saving,
  saveLabel,
  title,
  description,
  separationLabel,
  separationHint,
  separationOffWarning,
  onToggle,
  onSave,
}: GovernanceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm" style={{ color: 'var(--ink-2)' }}>
          {description}
        </p>
        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={enforceSeparationOfDuties}
              onChange={onToggle}
              className="mt-0.5 size-4 cursor-pointer rounded border-[var(--a30-border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span>
              <span className="block text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {separationLabel}
              </span>
              <span className="mt-0.5 block text-xs" style={{ color: 'var(--ink-3)' }}>
                {separationHint}
              </span>
            </span>
          </label>

          {!enforceSeparationOfDuties && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {separationOffWarning}
            </div>
          )}

          {message && <p className={`text-sm ${messageClass}`}>{message}</p>}

          <Button onClick={onSave} disabled={saving}>
            {saveLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
