'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SCREENING_QUESTIONS, ChecklistAnswer } from '@article30/shared';
import type { ScreeningDto } from '@article30/shared';

const ANSWER_OPTIONS = [
  {
    value: ChecklistAnswer.YES,
    labelKey: 'checklist.answer.YES',
    color: 'border-green-500 bg-green-50',
  },
  {
    value: ChecklistAnswer.PARTIAL,
    labelKey: 'checklist.answer.PARTIAL',
    color: 'border-amber-500 bg-amber-50',
  },
  {
    value: ChecklistAnswer.IN_PROGRESS,
    labelKey: 'checklist.answer.IN_PROGRESS',
    color: 'border-blue-500 bg-blue-50',
  },
  { value: ChecklistAnswer.NO, labelKey: 'checklist.answer.NO', color: 'border-red-500 bg-red-50' },
  {
    value: ChecklistAnswer.NA,
    labelKey: 'checklist.answer.NA',
    color: 'border-[var(--a30-border)] bg-[var(--surface-2)] text-[var(--ink-2)]',
  },
];

const UNSELECTED_ANSWER_CLASS =
  'border-[var(--a30-border)] bg-[var(--surface)] text-[var(--ink-2)] hover:bg-[var(--surface-2)]';

export default function NewScreeningPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = SCREENING_QUESTIONS.every(q => Boolean(responses[q.id]));

  const handleAnswer = useCallback((qId: string, value: string) => {
    setResponses(prev => ({ ...prev, [qId]: value }));
  }, []);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value),
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (!title || !allAnswered) {
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.post<ScreeningDto>('/screenings', { title, responses });
      router.push(`/checklist/${result.id}`);
    } catch {
      // handled by api client toast
    } finally {
      setSubmitting(false);
    }
  }, [title, allAnswered, responses, router]);

  const handleCancel = useCallback(() => router.push('/checklist'), [router]);

  let submitLabel: string;
  if (submitting) {
    submitLabel = t('screening.submitting');
  } else {
    submitLabel = t('screening.submit');
  }

  return (
    <>
      <div className="mb-6 max-w-3xl space-y-6">
        <div>
          <Label>{t('screening.titleLabel')}</Label>
          <Input
            className="mt-1"
            value={title}
            onChange={handleTitleChange}
            placeholder={t('screening.titlePlaceholder')}
          />
        </div>

        <div className="space-y-3">
          {SCREENING_QUESTIONS.map((q, i) => {
            let questionLabel: string;
            if (locale === 'fr') {
              questionLabel = q.label.fr;
            } else {
              questionLabel = q.label.en;
            }
            return (
              <div
                key={q.id}
                className="rounded-lg border px-4 py-3"
                style={{ borderColor: 'var(--a30-border)', background: 'var(--surface)' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                    {i + 1}. {questionLabel}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-3)' }}>
                    {q.articleRef}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ANSWER_OPTIONS.map(opt => (
                    <AnswerOption
                      key={opt.value}
                      questionId={q.id}
                      value={opt.value}
                      selected={responses[q.id] === opt.value}
                      color={opt.color}
                      label={t(opt.labelKey)}
                      onSelect={handleAnswer}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSubmit} disabled={submitting || !title || !allAnswered}>
            {submitLabel}
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </>
  );
}

interface AnswerOptionProps {
  questionId: string;
  value: string;
  selected: boolean;
  color: string;
  label: string;
  onSelect: (questionId: string, value: string) => void;
}

function AnswerOption({
  questionId,
  value,
  selected,
  color,
  label,
  onSelect,
}: Readonly<AnswerOptionProps>) {
  const handleClick = useCallback(() => onSelect(questionId, value), [onSelect, questionId, value]);
  let stateClass = UNSELECTED_ANSWER_CLASS;
  if (selected) {
    stateClass = color;
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${stateClass}`}
    >
      {label}
    </button>
  );
}
