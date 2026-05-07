'use client';

import { useState } from 'react';
import { useActionItems, type ActionItem } from '@/lib/violations';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n/context';

const STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;

export function ActionItemsPanel({ violationId }: { violationId: string }) {
  const { t } = useI18n();
  const { items, loading, error, create, update } = useActionItems(violationId);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        title,
        description: description || undefined,
        ownerId,
        deadline: new Date(deadline).toISOString(),
      });
      setShowForm(false);
      setTitle('');
      setDescription('');
      setOwnerId('');
      setDeadline('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
        {t('violation.actionItems.title')}
      </h3>
      {items.length === 0 && (
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-3)' }}>
          {t('violation.actionItems.empty')}
        </p>
      )}
      {items.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {items.map(item => (
            <ActionItemRow key={item.id} item={item} onUpdate={update} />
          ))}
        </ul>
      )}
      {!showForm && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => setShowForm(true)}
        >
          {t('violation.actionItems.newButton')}
        </Button>
      )}
      {showForm && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div>
            <Label htmlFor="title">{t('violation.actionItems.titleLabel')}</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              minLength={3}
            />
          </div>
          <div>
            <Label htmlFor="description">{t('violation.actionItems.descriptionOptional')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="ownerId">{t('violation.actionItems.ownerLabel')}</Label>
            <Input
              id="ownerId"
              value={ownerId}
              onChange={e => setOwnerId(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="deadline">{t('violation.actionItems.deadline')}</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              required
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
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? t('common.saving') : t('common.create')}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function ActionItemRow({
  item,
  onUpdate,
}: {
  item: ActionItem;
  onUpdate: (id: string, input: { status: ActionItem['status'] }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [updating, setUpdating] = useState(false);
  const handleStatusChange = async (next: ActionItem['status']) => {
    if (updating || next === item.status) return;
    setUpdating(true);
    try {
      await onUpdate(item.id, { status: next });
    } finally {
      setUpdating(false);
    }
  };
  return (
    <li className="rounded px-3 py-2" style={{ border: '1px solid var(--a30-border)' }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{item.title}</span>
        <select
          aria-label={`status for ${item.title}`}
          className="rounded px-1 py-0.5 text-xs"
          style={{ border: '1px solid var(--a30-border)' }}
          value={item.status}
          onChange={e => handleStatusChange(e.target.value as ActionItem['status'])}
          disabled={updating}
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {item.description && (
        <p className="mt-1 text-xs" style={{ color: 'var(--ink-2)' }}>
          {item.description}
        </p>
      )}
      <p className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>
        {t('violation.actionItems.ownerDisplay')}: {item.ownerId.slice(0, 8)}… ·{' '}
        {t('violation.actionItems.deadlineDisplay')}: {new Date(item.deadline).toLocaleDateString()}
      </p>
    </li>
  );
}
