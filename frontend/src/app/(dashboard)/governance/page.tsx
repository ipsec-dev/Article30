'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { formatDate } from '@/lib/dates';
import { getMe } from '@/lib/auth';
import { ChecklistScore } from '@/components/checklist/checklist-score';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CHECKLIST_ITEMS,
  CHECKLIST_CATEGORIES,
  WRITE_ROLES,
  ChecklistAnswer,
  ChecklistCategory,
  Priority,
  type ChecklistResponseDto,
  type UserDto,
  type PaginatedResponse,
} from '@article30/shared';

const USER_PAGE_LIMIT = 1000;
const CATEGORY_KEY_PREFIX = 'checklist.category.';
const ANSWER_KEY_PREFIX = 'checklist.answer.';
const PRIORITY_KEY_PREFIX = 'checklist.priority.';
const SAVING_ELLIPSIS = '...';

type ChecklistItem = (typeof CHECKLIST_ITEMS)[number];

function answerBadgeVariant(
  answer: ChecklistAnswer,
): 'default' | 'destructive' | 'secondary' | 'outline' {
  switch (answer) {
    case ChecklistAnswer.YES:
      return 'default';
    case ChecklistAnswer.NO:
      return 'destructive';
    case ChecklistAnswer.NA:
      return 'secondary';
    case ChecklistAnswer.PARTIAL:
    case ChecklistAnswer.IN_PROGRESS:
      return 'outline';
  }
}

const NEEDS_ACTION_PLAN: ReadonlySet<ChecklistAnswer> = new Set<ChecklistAnswer>([
  ChecklistAnswer.NO,
  ChecklistAnswer.PARTIAL,
  ChecklistAnswer.IN_PROGRESS,
]);

const ANSWER_OPTIONS: ChecklistAnswer[] = [
  ChecklistAnswer.YES,
  ChecklistAnswer.NO,
  ChecklistAnswer.NA,
  ChecklistAnswer.PARTIAL,
  ChecklistAnswer.IN_PROGRESS,
];

const PRIORITY_OPTIONS: Priority[] = [Priority.HIGH, Priority.MEDIUM, Priority.LOW];

type AnswerRadioProps = Readonly<{
  answer: ChecklistAnswer;
  itemId: string;
  checked: boolean;
  label: string;
  onSelect: (a: ChecklistAnswer) => void;
}>;

function AnswerRadio({ answer, itemId, checked, label, onSelect }: AnswerRadioProps) {
  const handleChange = useCallback(() => {
    onSelect(answer);
  }, [answer, onSelect]);

  return (
    <label className="flex items-center gap-1.5 text-sm">
      <input
        type="radio"
        name={`answer-${itemId}`}
        checked={checked}
        onChange={handleChange}
        className="accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}

type EditFormState = Readonly<{
  pendingAnswer: ChecklistAnswer | null;
  setPendingAnswer: (a: ChecklistAnswer | null) => void;
  pendingReason: string;
  setPendingReason: (v: string) => void;
  pendingActionPlan: string;
  setPendingActionPlan: (v: string) => void;
  pendingAssignedTo: string;
  setPendingAssignedTo: (v: string) => void;
  pendingDeadline: string;
  setPendingDeadline: (v: string) => void;
  pendingPriority: Priority | '';
  setPendingPriority: (v: Priority | '') => void;
}>;

type EditFormProps = Readonly<{
  item: ChecklistItem;
  state: EditFormState;
  users: UserDto[];
  saving: boolean;
  t: (key: string) => string;
  onSave: (id: string) => void;
  onCancel: () => void;
}>;

function EditForm({ item, state, users, saving, t, onSave, onCancel }: EditFormProps) {
  const {
    pendingAnswer,
    setPendingAnswer,
    pendingReason,
    setPendingReason,
    pendingActionPlan,
    setPendingActionPlan,
    pendingAssignedTo,
    setPendingAssignedTo,
    pendingDeadline,
    setPendingDeadline,
    pendingPriority,
    setPendingPriority,
  } = state;

  const handleReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPendingReason(e.target.value);
    },
    [setPendingReason],
  );

  const handleActionPlanChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPendingActionPlan(e.target.value);
    },
    [setPendingActionPlan],
  );

  const handleDeadlineChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPendingDeadline(e.target.value);
    },
    [setPendingDeadline],
  );

  const handlePriorityChange = useCallback(
    (v: string) => {
      setPendingPriority(v as Priority);
    },
    [setPendingPriority],
  );

  const handleSave = useCallback(() => {
    onSave(item.id);
  }, [onSave, item.id]);

  const showActionPlan = pendingAnswer !== null && NEEDS_ACTION_PLAN.has(pendingAnswer);
  let saveLabel = t('checklist.save');
  if (saving) {
    saveLabel = SAVING_ELLIPSIS;
  }

  return (
    <div className="mt-3 space-y-3 rounded-md bg-surface-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {ANSWER_OPTIONS.map(answer => (
          <AnswerRadio
            key={answer}
            answer={answer}
            itemId={item.id}
            checked={pendingAnswer === answer}
            label={t(ANSWER_KEY_PREFIX + answer)}
            onSelect={setPendingAnswer}
          />
        ))}
      </div>

      <Textarea
        placeholder={t('checklist.reasonPlaceholder')}
        value={pendingReason}
        onChange={handleReasonChange}
        className="text-sm"
      />

      {showActionPlan && (
        <div className="space-y-3 rounded-md border border-border bg-surface p-3">
          <p className="text-sm font-medium text-foreground">{t('checklist.actionPlan')}</p>
          <Textarea
            placeholder={t('checklist.actionPlanPlaceholder')}
            value={pendingActionPlan}
            onChange={handleActionPlanChange}
            className="text-sm"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t('checklist.assignedTo')}
              </label>
              <Select value={pendingAssignedTo} onValueChange={setPendingAssignedTo}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {`${u.firstName} ${u.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t('checklist.deadline')}
              </label>
              <Input
                type="date"
                value={pendingDeadline}
                onChange={handleDeadlineChange}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t('checklist.priority')}
              </label>
              <Select value={pendingPriority} onValueChange={handlePriorityChange}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(p => (
                    <SelectItem key={p} value={p}>
                      {t(PRIORITY_KEY_PREFIX + p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={!pendingAnswer || saving}>
          {saveLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          {t('checklist.cancel')}
        </Button>
      </div>
    </div>
  );
}

type ResponseSummaryProps = Readonly<{
  response: ChecklistResponseDto;
  t: (key: string) => string;
}>;

function ResponseSummary({ response, t }: ResponseSummaryProps) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <Badge variant={answerBadgeVariant(response.response)}>
        {t(ANSWER_KEY_PREFIX + response.response)}
      </Badge>
      {response.reason && <span className="italic">{response.reason}</span>}
      <span>{formatDate(response.respondedAt)}</span>
    </div>
  );
}

type ReviewInfoProps = Readonly<{
  response: ChecklistResponseDto;
  t: (key: string) => string;
}>;

function ReviewInfo({ response, t }: ReviewInfoProps) {
  return (
    <div className="mt-1 text-xs text-muted-foreground/70">
      {response.lastReviewedAt && (
        <span>
          {t('checklist.edit')}: {formatDate(response.lastReviewedAt)}
        </span>
      )}
      {response.lastReviewedAt && response.nextReviewAt && <span className="mx-1">&middot;</span>}
      {response.nextReviewAt && (
        <span>
          {t('checklist.reviewDue')}: {formatDate(response.nextReviewAt)}
        </span>
      )}
    </div>
  );
}

function getItemLabel(item: ChecklistItem, locale: string): string {
  if (locale === 'fr') {
    return item.label.fr;
  }
  return item.label.en;
}

type ItemDisplayProps = Readonly<{
  response: ChecklistResponseDto | undefined;
  isEditing: boolean;
  t: (key: string) => string;
}>;

function ItemDisplay({ response, isEditing, t }: ItemDisplayProps) {
  if (isEditing) {
    return null;
  }
  if (!response) {
    return <p className="mt-1 text-xs text-muted-foreground/70">{t('checklist.noResponse')}</p>;
  }
  const hasReviewInfo = response.lastReviewedAt || response.nextReviewAt;
  return (
    <>
      <ResponseSummary response={response} t={t} />
      {hasReviewInfo && <ReviewInfo response={response} t={t} />}
    </>
  );
}

type ItemEditTriggerProps = Readonly<{
  itemId: string;
  hasResponse: boolean;
  t: (key: string) => string;
  onStartEdit: (id: string) => void;
}>;

function ItemEditTrigger({ itemId, hasResponse, t, onStartEdit }: ItemEditTriggerProps) {
  const handleStartEdit = useCallback(() => {
    onStartEdit(itemId);
  }, [itemId, onStartEdit]);

  let editLabel = t('checklist.respond');
  if (hasResponse) {
    editLabel = t('checklist.edit');
  }

  return (
    <Button variant="outline" size="sm" onClick={handleStartEdit}>
      {editLabel}
    </Button>
  );
}

type ItemRowProps = Readonly<{
  item: ChecklistItem;
  response: ChecklistResponseDto | undefined;
  isEditing: boolean;
  locale: string;
  canWrite: boolean;
  t: (key: string) => string;
  onStartEdit: (id: string) => void;
  editState: EditFormState;
  users: UserDto[];
  saving: boolean;
  onSave: (id: string) => void;
  onCancel: () => void;
}>;

function ItemRow({
  item,
  response,
  isEditing,
  locale,
  canWrite,
  t,
  onStartEdit,
  editState,
  users,
  saving,
  onSave,
  onCancel,
}: ItemRowProps) {
  const itemLabel = getItemLabel(item, locale);
  const showEditTrigger = canWrite && !isEditing;

  return (
    <div id={item.id} className="scroll-mt-4 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {itemLabel}
            <span className="ml-2 text-xs font-normal text-muted-foreground/70">
              {item.articleRef}
            </span>
          </p>
          <ItemDisplay response={response} isEditing={isEditing} t={t} />
        </div>
        {showEditTrigger && (
          <ItemEditTrigger
            itemId={item.id}
            hasResponse={Boolean(response)}
            t={t}
            onStartEdit={onStartEdit}
          />
        )}
      </div>

      {isEditing && (
        <EditForm
          item={item}
          state={editState}
          users={users}
          saving={saving}
          t={t}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}

type CategorySectionProps = Readonly<{
  category: ChecklistCategory;
  items: ChecklistItem[];
  answeredCount: number;
  isCollapsed: boolean;
  t: (key: string) => string;
  locale: string;
  canWrite: boolean;
  responsesMap: Map<string, ChecklistResponseDto>;
  editingItem: string | null;
  onToggle: (c: ChecklistCategory) => void;
  onStartEdit: (id: string) => void;
  editState: EditFormState;
  users: UserDto[];
  saving: boolean;
  onSave: (id: string) => void;
  onCancel: () => void;
}>;

function CategorySection({
  category,
  items,
  answeredCount,
  isCollapsed,
  t,
  locale,
  canWrite,
  responsesMap,
  editingItem,
  onToggle,
  onStartEdit,
  editState,
  users,
  saving,
  onSave,
  onCancel,
}: CategorySectionProps) {
  const handleToggle = useCallback(() => {
    onToggle(category);
  }, [category, onToggle]);

  let collapseIndicator = '−';
  if (isCollapsed) {
    collapseIndicator = '+';
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={handleToggle}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <span>{t(CATEGORY_KEY_PREFIX + category)}</span>
            <Badge variant="secondary" className="text-xs font-normal">
              {answeredCount}/{items.length}
            </Badge>
          </CardTitle>
          <span className="text-muted-foreground text-sm">{collapseIndicator}</span>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent>
          <div className="space-y-4">
            {items.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                response={responsesMap.get(item.id)}
                isEditing={editingItem === item.id}
                locale={locale}
                canWrite={canWrite}
                t={t}
                onStartEdit={onStartEdit}
                editState={editState}
                users={users}
                saving={saving}
                onSave={onSave}
                onCancel={onCancel}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function ChecklistPage() {
  const { t, locale } = useI18n();
  const [responses, setResponses] = useState<ChecklistResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDto | null>(null);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [pendingAnswer, setPendingAnswer] = useState<ChecklistAnswer | null>(null);
  const [pendingReason, setPendingReason] = useState('');
  const [pendingActionPlan, setPendingActionPlan] = useState('');
  const [pendingAssignedTo, setPendingAssignedTo] = useState('');
  const [pendingDeadline, setPendingDeadline] = useState('');
  const [pendingPriority, setPendingPriority] = useState<Priority | ''>('');
  const [saving, setSaving] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<ChecklistCategory>>(new Set());

  let canWrite = false;
  if (user) {
    canWrite = (WRITE_ROLES as readonly string[]).includes(user.role);
  }

  const resetPendingFields = useCallback(() => {
    setPendingAnswer(null);
    setPendingReason('');
    setPendingActionPlan('');
    setPendingAssignedTo('');
    setPendingDeadline('');
    setPendingPriority('');
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [me, checklistData] = await Promise.all([
        getMe(),
        api.get<ChecklistResponseDto[]>('/checklist/responses'),
      ]);
      setUser(me);
      let safeResponses: ChecklistResponseDto[] = [];
      if (Array.isArray(checklistData)) {
        safeResponses = checklistData;
      }
      setResponses(safeResponses);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const result = await api.get<PaginatedResponse<UserDto>>(`/users?limit=${USER_PAGE_LIMIT}`);
      setUsers(result.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (canWrite) {
      fetchUsers();
    }
  }, [canWrite, fetchUsers]);

  const responsesMap = useMemo(() => new Map(responses.map(r => [r.itemId, r])), [responses]);

  const scoreSummary = useMemo(() => {
    const total = CHECKLIST_ITEMS.length;
    const answered = CHECKLIST_ITEMS.filter(item => responsesMap.has(item.id)).length;
    const score = total === 0 ? 0 : Math.round((answered / total) * 100);
    const sections = CHECKLIST_CATEGORIES.map(category => {
      const items = CHECKLIST_ITEMS.filter(item => item.category === category);
      const sectionAnswered = items.filter(item => responsesMap.has(item.id)).length;
      return {
        key: category,
        label: t(CATEGORY_KEY_PREFIX + category),
        answered: sectionAnswered,
        total: items.length,
      };
    });
    return { score, answered, total, sections };
  }, [responsesMap, t]);

  const handleCancelEditing = useCallback(() => {
    setEditingItem(null);
    resetPendingFields();
  }, [resetPendingFields]);

  const toggleCategory = useCallback((category: ChecklistCategory) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(
    async (itemId: string) => {
      if (!pendingAnswer) {
        return;
      }
      setSaving(true);
      try {
        const needsActionPlan = NEEDS_ACTION_PLAN.has(pendingAnswer);
        let reason: string | null = null;
        let actionPlan: string | null = null;
        let assignedTo: string | null = null;
        let deadline: string | null = null;
        let priority: Priority | null = null;
        if (needsActionPlan) {
          reason = pendingReason;
          if (pendingActionPlan) {
            actionPlan = pendingActionPlan;
          }
          if (pendingAssignedTo) {
            assignedTo = pendingAssignedTo;
          }
          if (pendingDeadline) {
            deadline = pendingDeadline;
          }
          if (pendingPriority) {
            priority = pendingPriority;
          }
        }
        await api.put<ChecklistResponseDto>(`/checklist/${itemId}`, {
          response: pendingAnswer,
          reason,
          actionPlan,
          assignedTo,
          deadline,
          priority,
        });
        await fetchData();
        setEditingItem(null);
        resetPendingFields();
      } catch {
      } finally {
        setSaving(false);
      }
    },
    [
      pendingAnswer,
      pendingReason,
      pendingActionPlan,
      pendingAssignedTo,
      pendingDeadline,
      pendingPriority,
      fetchData,
      resetPendingFields,
    ],
  );

  const startEditing = useCallback(
    (itemId: string) => {
      const existing = responsesMap.get(itemId);
      setEditingItem(itemId);
      setPendingAnswer(existing?.response ?? null);
      setPendingReason(existing?.reason ?? '');
      setPendingActionPlan(existing?.actionPlan ?? '');
      setPendingAssignedTo(existing?.assignedTo ?? '');
      setPendingDeadline(existing?.deadline ?? '');
      setPendingPriority(existing?.priority ?? '');
    },
    [responsesMap],
  );

  const editState: EditFormState = {
    pendingAnswer,
    setPendingAnswer,
    pendingReason,
    setPendingReason,
    pendingActionPlan,
    setPendingActionPlan,
    pendingAssignedTo,
    setPendingAssignedTo,
    pendingDeadline,
    setPendingDeadline,
    pendingPriority,
    setPendingPriority,
  };

  let mainContent: React.ReactNode;
  if (loading) {
    mainContent = (
      <div className="mt-8 flex justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-border border-t-[var(--primary)]" />
      </div>
    );
  } else {
    mainContent = (
      <div className="mt-6 space-y-8">
        {CHECKLIST_CATEGORIES.map(category => {
          const items = CHECKLIST_ITEMS.filter(item => item.category === category);
          const answeredCount = items.filter(item => responsesMap.has(item.id)).length;
          const isCollapsed = collapsedCategories.has(category);

          return (
            <CategorySection
              key={category}
              category={category}
              items={items}
              answeredCount={answeredCount}
              isCollapsed={isCollapsed}
              t={t}
              locale={locale}
              canWrite={canWrite}
              responsesMap={responsesMap}
              editingItem={editingItem}
              onToggle={toggleCategory}
              onStartEdit={startEditing}
              editState={editState}
              users={users}
              saving={saving}
              onSave={handleSave}
              onCancel={handleCancelEditing}
            />
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="mt-6">
        <ChecklistScore
          score={scoreSummary.score}
          answered={scoreSummary.answered}
          total={scoreSummary.total}
          sections={scoreSummary.sections}
        />
      </div>

      <div className="mt-8">
        <h2 className="text-base font-semibold text-foreground">
          {t('checklist.governanceTitle')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('checklist.governanceDescription')}</p>
      </div>

      {mainContent}
    </>
  );
}
