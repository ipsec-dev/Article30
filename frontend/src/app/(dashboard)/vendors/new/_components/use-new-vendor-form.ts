'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { DpaStatus } from '@article30/shared';
import type { VendorDto, PaginatedResponse, TreatmentDto } from '@article30/shared';

const VENDOR_LIMIT = 200;

export function useNewVendorForm() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [treatments, setTreatments] = useState<{ id: string; name: string }[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [country, setCountry] = useState('');
  const [dpaStatus, setDpaStatus] = useState<DpaStatus>(DpaStatus.MISSING);
  const [dpaSigned, setDpaSigned] = useState('');
  const [dpaExpiry, setDpaExpiry] = useState('');
  const [isSubProcessor, setIsSubProcessor] = useState(false);
  const [parentVendorId, setParentVendorId] = useState('');
  const [treatmentIds, setTreatmentIds] = useState<string[]>([]);

  useEffect(() => {
    api
      .get<PaginatedResponse<{ id: string; name: string }>>(`/vendors?limit=${VENDOR_LIMIT}`)
      .then(res => setVendors(res.data))
      .catch(() => {});
    api
      .get<PaginatedResponse<TreatmentDto>>(`/treatments?limit=${VENDOR_LIMIT}`)
      .then(res => setTreatments(res.data.map(tr => ({ id: tr.id, name: tr.name }))))
      .catch(() => {});
  }, []);

  const toggleTreatment = useCallback((id: string) => {
    setTreatmentIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  }, []);

  const handleBack = useCallback(() => router.push('/vendors'), [router]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    [],
  );
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value),
    [],
  );
  const handleContactNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setContactName(e.target.value),
    [],
  );
  const handleContactEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setContactEmail(e.target.value),
    [],
  );
  const handleCountryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setCountry(e.target.value),
    [],
  );
  const handleDpaStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setDpaStatus(e.target.value as DpaStatus);
  }, []);
  const handleDpaSignedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDpaSigned(e.target.value),
    [],
  );
  const handleDpaExpiryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDpaExpiry(e.target.value),
    [],
  );
  const handleSubProcessorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setIsSubProcessor(e.target.checked),
    [],
  );
  const handleParentVendorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => setParentVendorId(e.target.value),
    [],
  );

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    try {
      let treatmentIdsValue: string[] | undefined;
      if (treatmentIds.length > 0) {
        treatmentIdsValue = treatmentIds;
      }
      const body: Record<string, unknown> = {
        name,
        dpaStatus,
        isSubProcessor,
        description: description || undefined,
        contactName: contactName || undefined,
        contactEmail: contactEmail || undefined,
        country: country || undefined,
        dpaSigned: dpaSigned || undefined,
        dpaExpiry: dpaExpiry || undefined,
        parentVendorId: parentVendorId || undefined,
        treatmentIds: treatmentIdsValue,
      };
      const res = await api.post<VendorDto>('/vendors', body);
      router.push(`/vendors/${res.id}`);
    } catch {
      // handled by api client
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    vendors,
    treatments,
    name,
    description,
    contactName,
    contactEmail,
    country,
    dpaStatus,
    dpaSigned,
    dpaExpiry,
    isSubProcessor,
    parentVendorId,
    treatmentIds,
    toggleTreatment,
    handleBack,
    handleNameChange,
    handleDescriptionChange,
    handleContactNameChange,
    handleContactEmailChange,
    handleCountryChange,
    handleDpaStatusChange,
    handleDpaSignedChange,
    handleDpaExpiryChange,
    handleSubProcessorChange,
    handleParentVendorChange,
    handleSubmit,
  };
}
