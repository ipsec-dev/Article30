'use client';

import { useState } from 'react';
import { useRiskAssessment } from '@/lib/violations';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n/context';

const LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
type Level = (typeof LEVELS)[number];

interface RiskPanelProps {
  violationId: string;
}

export function RiskPanel({ violationId }: RiskPanelProps) {
  const { t } = useI18n();
  const { current, history, loading, error, create } = useRiskAssessment(violationId);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [likelihood, setLikelihood] = useState<Level>('MEDIUM');
  const [severity, setSeverity] = useState<Level>('MEDIUM');
  const [crossBorder, setCrossBorder] = useState(false);
  const [potentialConsequences, setConsequences] = useState('');
  const [mitigatingFactors, setMitigating] = useState('');
  const [estimatedSubjectCount, setSubjectCount] = useState('');
  const [estimatedRecordCount, setRecordCount] = useState('');
  const [affectedDataCategories, setCategories] = useState('');

  if (loading)
    return (
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
        {t('common.loading')}
      </p>
    );
  if (error)
    return (
      <p className="text-sm text-red-600">
        {t('common.error')}: {error.message}
      </p>
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await create({
        likelihood,
        severity,
        affectedDataCategories: affectedDataCategories
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        estimatedSubjectCount: estimatedSubjectCount ? Number(estimatedSubjectCount) : undefined,
        estimatedRecordCount: estimatedRecordCount ? Number(estimatedRecordCount) : undefined,
        crossBorder,
        potentialConsequences,
        mitigatingFactors: mitigatingFactors || undefined,
      });
      setShowForm(false);
      setConsequences('');
      setMitigating('');
      setCategories('');
      setSubjectCount('');
      setRecordCount('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
        {t('violation.risk.title')}
      </h3>

      {current && (
        <div className="mt-2">
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
            {t('violation.risk.current')}:{' '}
            <span className="font-medium" style={{ color: 'var(--ink-2)' }}>
              {current.computedRiskLevel}
            </span>{' '}
            (likelihood={current.likelihood}, severity={current.severity})
          </p>
          <Matrix3x3 likelihood={current.likelihood} severity={current.severity} />
          <p className="mt-2 text-xs" style={{ color: 'var(--ink-3)' }}>
            {t('violation.risk.affected')}: {current.affectedDataCategories.join(', ') || '—'} ·{' '}
            {t('violation.risk.crossBorder')}:{' '}
            {current.crossBorder
              ? t('violation.risk.crossBorderYes')
              : t('violation.risk.crossBorderNo')}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-xs" style={{ color: 'var(--ink-2)' }}>
            {current.potentialConsequences}
          </p>
        </div>
      )}

      {!current && (
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-3)' }}>
          {t('violation.risk.empty')}
        </p>
      )}

      <p className="mt-2 text-xs" style={{ color: 'var(--ink-3)' }}>
        {t('violation.risk.historyCount').replace('{{count}}', String(history.length))}
      </p>

      {!showForm && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => setShowForm(true)}
        >
          {current ? t('violation.risk.reassess') : t('violation.risk.assess')}
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{t('violation.risk.likelihood')}</Label>
              <select
                aria-label="likelihood"
                className="block w-full rounded px-2 py-1 text-sm"
                style={{ border: '1px solid var(--a30-border)' }}
                value={likelihood}
                onChange={e => setLikelihood(e.target.value as Level)}
              >
                {LEVELS.map(l => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('violation.risk.severity')}</Label>
              <select
                aria-label="severity"
                className="block w-full rounded px-2 py-1 text-sm"
                style={{ border: '1px solid var(--a30-border)' }}
                value={severity}
                onChange={e => setSeverity(e.target.value as Level)}
              >
                {LEVELS.map(l => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="affectedDataCategories">
              {t('violation.risk.affectedDataCategories')}
            </Label>
            <Input
              id="affectedDataCategories"
              value={affectedDataCategories}
              onChange={e => setCategories(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="estimatedSubjectCount">{t('violation.risk.subjectCount')}</Label>
              <Input
                id="estimatedSubjectCount"
                type="number"
                min={0}
                value={estimatedSubjectCount}
                onChange={e => setSubjectCount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="estimatedRecordCount">{t('violation.risk.recordCount')}</Label>
              <Input
                id="estimatedRecordCount"
                type="number"
                min={0}
                value={estimatedRecordCount}
                onChange={e => setRecordCount(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
            <input
              type="checkbox"
              checked={crossBorder}
              onChange={e => setCrossBorder(e.target.checked)}
            />
            {t('violation.risk.crossBorderLabel')}
          </label>
          <div>
            <Label htmlFor="potentialConsequences">{t('violation.risk.consequences')}</Label>
            <Textarea
              id="potentialConsequences"
              value={potentialConsequences}
              onChange={e => setConsequences(e.target.value)}
              required
              minLength={10}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="mitigatingFactors">{t('violation.risk.mitigatingFactors')}</Label>
            <Textarea
              id="mitigatingFactors"
              value={mitigatingFactors}
              onChange={e => setMitigating(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={submitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || potentialConsequences.length < 10}
            >
              {submitting ? t('common.saving') : t('violation.risk.saveAssessment')}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function Matrix3x3({ likelihood, severity }: { likelihood: Level; severity: Level }) {
  const { t } = useI18n();
  return (
    <table className="mt-2 border-collapse text-xs">
      <thead>
        <tr>
          <th className="px-2 py-1" style={{ border: '1px solid var(--a30-border)' }}></th>
          {LEVELS.map(s => (
            <th key={s} className="px-2 py-1" style={{ border: '1px solid var(--a30-border)' }}>
              {t('violation.risk.matrixSeverity').replace('{{level}}', s)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {LEVELS.map(l => (
          <tr key={l}>
            <th className="px-2 py-1 text-left" style={{ border: '1px solid var(--a30-border)' }}>
              {t('violation.risk.matrixLikelihood').replace('{{level}}', l)}
            </th>
            {LEVELS.map(s => {
              const isCurrent = l === likelihood && s === severity;
              return (
                <td
                  key={s}
                  className="px-2 py-1"
                  style={{
                    border: '1px solid var(--a30-border)',
                    background: isCurrent ? 'var(--primary-600)' : 'var(--surface-2)',
                    color: isCurrent ? '#fff' : undefined,
                  }}
                >
                  {isCurrent ? '●' : ''}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
