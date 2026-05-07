'use client';

import { useCallback, useEffect, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Severity } from '@article30/shared';
import type { UserDto } from '@article30/shared';

export interface ViolationFormData {
  title: string;
  description: string;
  severity: Severity;
  discoveredAt: string;
  notifiedToCnil: boolean;
  notifiedToPersons: boolean;
  remediation: string;
  dataCategories?: string[];
  estimatedRecords?: number;
  riskLevel?: string;
  crossBorder?: boolean;
  assignedTo?: string;
}

type ViolationFormProps = Readonly<{
  initialData?: Partial<ViolationFormData>;
  onSubmit: (data: ViolationFormData) => void;
  isLoading: boolean;
}>;

const DATE_SLICE_END = 10;

function parseDataCategories(raw: string): string[] {
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function getInitialDiscoveredAt(initialDiscoveredAt: string | undefined): string {
  if (initialDiscoveredAt) {
    return initialDiscoveredAt.slice(0, DATE_SLICE_END);
  }
  return new Date().toISOString().slice(0, DATE_SLICE_END);
}

function buildOptionalFields(fields: {
  dataCategoriesRaw: string;
  estimatedRecords: string;
  riskLevel: string;
  assignedTo: string;
}): Partial<ViolationFormData> {
  const optional: Partial<ViolationFormData> = {};
  const dataCategories = parseDataCategories(fields.dataCategoriesRaw);
  if (dataCategories.length > 0) {
    optional.dataCategories = dataCategories;
  }
  if (fields.estimatedRecords) {
    optional.estimatedRecords = Number.parseInt(fields.estimatedRecords, 10);
  }
  if (fields.riskLevel) {
    optional.riskLevel = fields.riskLevel;
  }
  if (fields.assignedTo) {
    optional.assignedTo = fields.assignedTo;
  }
  return optional;
}

function buildCoreInitialState(initialData: Partial<ViolationFormData> | undefined) {
  return {
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    severity: initialData?.severity ?? Severity.LOW,
    notifiedToCnil: initialData?.notifiedToCnil ?? false,
    notifiedToPersons: initialData?.notifiedToPersons ?? false,
    remediation: initialData?.remediation ?? '',
  };
}

function buildImpactInitialState(initialData: Partial<ViolationFormData> | undefined) {
  return {
    dataCategoriesRaw: initialData?.dataCategories?.join(', ') ?? '',
    estimatedRecords: initialData?.estimatedRecords?.toString() ?? '',
    riskLevel: initialData?.riskLevel ?? '',
    crossBorder: initialData?.crossBorder ?? false,
    assignedTo: initialData?.assignedTo ?? '',
  };
}

function buildInitialState(initialData: Partial<ViolationFormData> | undefined) {
  return {
    ...buildCoreInitialState(initialData),
    ...buildImpactInitialState(initialData),
  };
}

function useViolationFormState(initialData: Partial<ViolationFormData> | undefined) {
  const initial = buildInitialState(initialData);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [severity, setSeverity] = useState<Severity>(initial.severity);
  const [discoveredAt, setDiscoveredAt] = useState(() =>
    getInitialDiscoveredAt(initialData?.discoveredAt),
  );
  const [notifiedToCnil, setNotifiedToCnil] = useState(initial.notifiedToCnil);
  const [notifiedToPersons, setNotifiedToPersons] = useState(initial.notifiedToPersons);
  const [remediation, setRemediation] = useState(initial.remediation);
  const [dataCategoriesRaw, setDataCategoriesRaw] = useState(initial.dataCategoriesRaw);
  const [estimatedRecords, setEstimatedRecords] = useState(initial.estimatedRecords);
  const [riskLevel, setRiskLevel] = useState(initial.riskLevel);
  const [crossBorder, setCrossBorder] = useState(initial.crossBorder);
  const [assignedTo, setAssignedTo] = useState(initial.assignedTo);

  return {
    values: {
      title,
      description,
      severity,
      discoveredAt,
      notifiedToCnil,
      notifiedToPersons,
      remediation,
      dataCategoriesRaw,
      estimatedRecords,
      riskLevel,
      crossBorder,
      assignedTo,
    },
    setters: {
      setTitle,
      setDescription,
      setSeverity,
      setDiscoveredAt,
      setNotifiedToCnil,
      setNotifiedToPersons,
      setRemediation,
      setDataCategoriesRaw,
      setEstimatedRecords,
      setRiskLevel,
      setCrossBorder,
      setAssignedTo,
    },
  };
}

function useViolationFormHandlers(setters: ReturnType<typeof useViolationFormState>['setters']) {
  return {
    handleTitleChange: useCallback(
      (e: ChangeEvent<HTMLInputElement>) => setters.setTitle(e.target.value),
      [setters],
    ),
    handleDescriptionChange: useCallback(
      (e: ChangeEvent<HTMLTextAreaElement>) => setters.setDescription(e.target.value),
      [setters],
    ),
    handleSeverityChange: useCallback((v: string) => setters.setSeverity(v as Severity), [setters]),
    handleDiscoveredAtChange: useCallback(
      (e: ChangeEvent<HTMLInputElement>) => setters.setDiscoveredAt(e.target.value),
      [setters],
    ),
    handleNotifiedToCnilChange: useCallback(
      (e: ChangeEvent<HTMLInputElement>) => setters.setNotifiedToCnil(e.target.checked),
      [setters],
    ),
    handleNotifiedToPersonsChange: useCallback(
      (e: ChangeEvent<HTMLInputElement>) => setters.setNotifiedToPersons(e.target.checked),
      [setters],
    ),
    handleRemediationChange: useCallback(
      (e: ChangeEvent<HTMLTextAreaElement>) => setters.setRemediation(e.target.value),
      [setters],
    ),
    handleDataCategoriesChange: useCallback(
      (e: ChangeEvent<HTMLInputElement>) => setters.setDataCategoriesRaw(e.target.value),
      [setters],
    ),
    handleEstimatedRecordsChange: useCallback(
      (e: ChangeEvent<HTMLInputElement>) => setters.setEstimatedRecords(e.target.value),
      [setters],
    ),
    handleCrossBorderChange: useCallback(
      (e: ChangeEvent<HTMLInputElement>) => setters.setCrossBorder(e.target.checked),
      [setters],
    ),
    handleAssignedToChange: useCallback((v: string) => setters.setAssignedTo(v), [setters]),
    handleRiskLevelChange: useCallback((v: string) => setters.setRiskLevel(v), [setters]),
  };
}

function getSubmitLabelKey(isLoading: boolean): string {
  if (isLoading) {
    return 'common.loading';
  }
  return 'common.save';
}

function userDisplayLabel(u: UserDto): string {
  const name = `${u.firstName} ${u.lastName}`.trim();
  return name || u.email.split('@')[0];
}

export function ViolationForm({ initialData, onSubmit, isLoading }: ViolationFormProps) {
  const { t } = useI18n();
  const { values, setters } = useViolationFormState(initialData);
  const handlers = useViolationFormHandlers(setters);
  const [users, setUsers] = useState<UserDto[]>([]);

  useEffect(() => {
    api
      .get<UserDto[]>('/users')
      .catch(() => [] as UserDto[])
      .then(setUsers);
  }, []);
  const {
    title,
    description,
    severity,
    discoveredAt,
    notifiedToCnil,
    notifiedToPersons,
    remediation,
    dataCategoriesRaw,
    estimatedRecords,
    riskLevel,
    crossBorder,
    assignedTo,
  } = values;
  const {
    handleTitleChange,
    handleDescriptionChange,
    handleSeverityChange,
    handleDiscoveredAtChange,
    handleNotifiedToCnilChange,
    handleNotifiedToPersonsChange,
    handleRemediationChange,
    handleDataCategoriesChange,
    handleEstimatedRecordsChange,
    handleCrossBorderChange,
    handleRiskLevelChange,
  } = handlers;

  function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit({
      title,
      description,
      severity,
      discoveredAt: new Date(discoveredAt).toISOString(),
      notifiedToCnil,
      notifiedToPersons,
      remediation,
      crossBorder,
      ...buildOptionalFields({ dataCategoriesRaw, estimatedRecords, riskLevel, assignedTo }),
    });
  }

  const submitLabel = t(getSubmitLabelKey(isLoading));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-0">
          <div>
            <Label htmlFor="title">{t('violation.title')} *</Label>
            <Input
              id="title"
              value={title}
              onChange={handleTitleChange}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">{t('common.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={handleDescriptionChange}
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="severity">{t('violation.severity')}</Label>
            <Select value={severity} onValueChange={handleSeverityChange}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Severity).map(s => (
                  <SelectItem key={s} value={s}>
                    {t(`violation.severity.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="discoveredAt">{t('violation.discoveredAt')}</Label>
            <Input
              id="discoveredAt"
              type="date"
              value={discoveredAt}
              onChange={handleDiscoveredAtChange}
              className="mt-1"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
              <input
                type="checkbox"
                checked={notifiedToCnil}
                onChange={handleNotifiedToCnilChange}
                className="size-4 rounded"
                style={{ borderColor: 'var(--a30-border)', color: 'var(--primary)' }}
              />
              {t('violation.notifiedToCnil')}
            </label>

            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
              <input
                type="checkbox"
                checked={notifiedToPersons}
                onChange={handleNotifiedToPersonsChange}
                className="size-4 rounded"
                style={{ borderColor: 'var(--a30-border)', color: 'var(--primary)' }}
              />
              {t('violation.notifiedToPersons')}
            </label>
          </div>

          <div>
            <Label htmlFor="remediation">{t('violation.remediation')}</Label>
            <Textarea
              id="remediation"
              value={remediation}
              onChange={handleRemediationChange}
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Impact Assessment Section */}
      <Card>
        <CardContent className="space-y-4 pt-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
            {t('violation.dataCategories')}
          </p>

          <div>
            <Label htmlFor="dataCategories">{t('violation.dataCategories')}</Label>
            <Input
              id="dataCategories"
              value={dataCategoriesRaw}
              onChange={handleDataCategoriesChange}
              placeholder="e.g. Identity, Health, Financial"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="estimatedRecords">{t('violation.estimatedRecords')}</Label>
            <Input
              id="estimatedRecords"
              type="number"
              value={estimatedRecords}
              onChange={handleEstimatedRecordsChange}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="riskLevel">{t('violation.riskLevel')}</Label>
            <Select value={riskLevel} onValueChange={handleRiskLevelChange}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="-" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">{t('violation.severity.LOW')}</SelectItem>
                <SelectItem value="MEDIUM">{t('violation.severity.MEDIUM')}</SelectItem>
                <SelectItem value="HIGH">{t('violation.severity.HIGH')}</SelectItem>
                <SelectItem value="CRITICAL">{t('violation.severity.CRITICAL')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
            <input
              type="checkbox"
              checked={crossBorder}
              onChange={handleCrossBorderChange}
              className="size-4 rounded"
              style={{ borderColor: 'var(--a30-border)', color: 'var(--primary)' }}
            />
            {t('violation.crossBorder')}
          </label>

          <div>
            <Label htmlFor="assignedTo">{t('violation.assignedTo')}</Label>
            <Select
              value={assignedTo || '__none__'}
              onValueChange={v => handlers.handleAssignedToChange(v === '__none__' ? '' : v)}
            >
              <SelectTrigger id="assignedTo" className="mt-1 w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {userDisplayLabel(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
