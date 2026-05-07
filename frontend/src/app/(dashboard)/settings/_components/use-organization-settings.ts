'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { OrganizationDto } from '@article30/shared';
import type { FreshnessForm, OrgForm } from './types';

const DEFAULT_FRESHNESS_THRESHOLD_MONTHS = 6;
const DEFAULT_REVIEW_CYCLE_MONTHS = 12;
const MIN_MONTHS = 1;
const DECIMAL_RADIX = 10;
const ORGANIZATION_ENDPOINT = '/organization';

const EMPTY_FORM: OrgForm = {
  companyName: '',
  siren: '',
  address: '',
  representativeName: '',
  representativeRole: '',
  dpoName: '',
  dpoEmail: '',
  dpoPhone: '',
  annualTurnover: '',
};

const DEFAULT_FRESHNESS: FreshnessForm = {
  freshnessThresholdMonths: DEFAULT_FRESHNESS_THRESHOLD_MONTHS,
  reviewCycleMonths: DEFAULT_REVIEW_CYCLE_MONTHS,
};

function orgToForm(org: OrganizationDto): OrgForm {
  return {
    companyName: org.companyName ?? '',
    siren: org.siren ?? '',
    address: org.address ?? '',
    representativeName: org.representativeName ?? '',
    representativeRole: org.representativeRole ?? '',
    dpoName: org.dpoName ?? '',
    dpoEmail: org.dpoEmail ?? '',
    dpoPhone: org.dpoPhone ?? '',
    annualTurnover: org.annualTurnover?.toString() ?? '',
  };
}

function orgToFreshness(org: OrganizationDto): FreshnessForm {
  return {
    freshnessThresholdMonths: org.freshnessThresholdMonths ?? DEFAULT_FRESHNESS_THRESHOLD_MONTHS,
    reviewCycleMonths: org.reviewCycleMonths ?? DEFAULT_REVIEW_CYCLE_MONTHS,
  };
}

type Translate = (key: string) => string;

const SETTINGS_SAVE_SUCCESS_KEY = 'settings.saveSuccess';
const SETTINGS_SAVE_ERROR_KEY = 'settings.saveError';

export function useOrganizationSettings(t: Translate) {
  const [form, setForm] = useState<OrgForm>(EMPTY_FORM);
  const [freshnessForm, setFreshnessForm] = useState<FreshnessForm>(DEFAULT_FRESHNESS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingFreshness, setSavingFreshness] = useState(false);
  const [enforceSeparationOfDuties, setEnforceSeparationOfDuties] = useState(true);
  const [savingGovernance, setSavingGovernance] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [freshnessMessage, setFreshnessMessage] = useState<string | null>(null);
  const [governanceMessage, setGovernanceMessage] = useState<string | null>(null);

  const fetchOrg = useCallback(async () => {
    try {
      const org = await api.get<OrganizationDto>(ORGANIZATION_ENDPOINT);
      setForm(orgToForm(org));
      setFreshnessForm(orgToFreshness(org));
      setEnforceSeparationOfDuties(org.enforceSeparationOfDuties);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  const handleChange = useCallback(
    (field: keyof OrgForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }));
      setMessage(null);
    },
    [],
  );

  const handleAnnualTurnoverChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, annualTurnover: e.target.value }));
    setMessage(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      let annualTurnover: number | undefined;
      if (form.annualTurnover) {
        annualTurnover = Number.parseInt(form.annualTurnover, DECIMAL_RADIX);
      }
      await api.patch(ORGANIZATION_ENDPOINT, {
        ...form,
        annualTurnover,
      });
      setMessage(t(SETTINGS_SAVE_SUCCESS_KEY));
    } catch {
      setMessage(t(SETTINGS_SAVE_ERROR_KEY));
    } finally {
      setSaving(false);
    }
  }, [form, t]);

  const handleFreshnessChange = useCallback(
    (field: keyof FreshnessForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseInt(e.target.value, DECIMAL_RADIX);
      if (!Number.isNaN(value) && value >= MIN_MONTHS) {
        setFreshnessForm(prev => ({ ...prev, [field]: value }));
        setFreshnessMessage(null);
      }
    },
    [],
  );

  const handleFreshnessSave = useCallback(async () => {
    setSavingFreshness(true);
    setFreshnessMessage(null);
    try {
      await api.patch(ORGANIZATION_ENDPOINT, freshnessForm);
      setFreshnessMessage(t(SETTINGS_SAVE_SUCCESS_KEY));
    } catch {
      setFreshnessMessage(t(SETTINGS_SAVE_ERROR_KEY));
    } finally {
      setSavingFreshness(false);
    }
  }, [freshnessForm, t]);

  const handleSeparationToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEnforceSeparationOfDuties(e.target.checked);
    setGovernanceMessage(null);
  }, []);

  const handleGovernanceSave = useCallback(async () => {
    setSavingGovernance(true);
    setGovernanceMessage(null);
    try {
      await api.patch(ORGANIZATION_ENDPOINT, { enforceSeparationOfDuties });
      setGovernanceMessage(t(SETTINGS_SAVE_SUCCESS_KEY));
    } catch {
      setGovernanceMessage(t(SETTINGS_SAVE_ERROR_KEY));
    } finally {
      setSavingGovernance(false);
    }
  }, [enforceSeparationOfDuties, t]);

  return {
    form,
    freshnessForm,
    loading,
    saving,
    savingFreshness,
    enforceSeparationOfDuties,
    savingGovernance,
    message,
    freshnessMessage,
    governanceMessage,
    handleChange,
    handleAnnualTurnoverChange,
    handleSave,
    handleFreshnessChange,
    handleFreshnessSave,
    handleSeparationToggle,
    handleGovernanceSave,
  };
}
