'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FreshnessForm } from './types';

type FreshnessConfigCardProps = Readonly<{
  freshnessForm: FreshnessForm;
  message: string | null;
  messageClass: string;
  saving: boolean;
  saveLabel: string;
  title: string;
  description: string;
  thresholdLabel: string;
  reviewCycleLabel: string;
  onChange: (field: keyof FreshnessForm) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}>;

export function FreshnessConfigCard({
  freshnessForm,
  message,
  messageClass,
  saving,
  saveLabel,
  title,
  description,
  thresholdLabel,
  reviewCycleLabel,
  onChange,
  onSave,
}: FreshnessConfigCardProps) {
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
          <div className="space-y-1.5">
            <Label htmlFor="freshnessThreshold">{thresholdLabel}</Label>
            <Input
              id="freshnessThreshold"
              type="number"
              min={1}
              value={freshnessForm.freshnessThresholdMonths}
              onChange={onChange('freshnessThresholdMonths')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reviewCycle">{reviewCycleLabel}</Label>
            <Input
              id="reviewCycle"
              type="number"
              min={1}
              value={freshnessForm.reviewCycleMonths}
              onChange={onChange('reviewCycleMonths')}
            />
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
