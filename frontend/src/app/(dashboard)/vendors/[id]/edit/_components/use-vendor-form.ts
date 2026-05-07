'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { DpaStatus } from '@article30/shared';
import type { PaginatedResponse, TreatmentDto } from '@article30/shared';

const VENDOR_LIMIT = 200;

interface VendorDetail {
  id: string;
  name: string;
  description: string | null;
  contactName: string | null;
  contactEmail: string | null;
  country: string | null;
  dpaStatus: DpaStatus;
  dpaSigned: string | null;
  dpaExpiry: string | null;
  isSubProcessor: boolean;
  parentVendorId: string | null;
  treatments: { vendorId: string; treatmentId: string; treatment: { id: string; name: string } }[];
}

function toDateInput(iso: string | null): string {
  if (!iso) {
    return '';
  }
  return new Date(iso).toISOString().split('T')[0];
}

export function useVendorForm(id: string) {
  const [fetching, setFetching] = useState(true);
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
    Promise.all([
      api.get<VendorDetail>(`/vendors/${id}`),
      api.get<PaginatedResponse<{ id: string; name: string }>>(`/vendors?limit=${VENDOR_LIMIT}`),
      api.get<PaginatedResponse<TreatmentDto>>(`/treatments?limit=${VENDOR_LIMIT}`),
    ])
      .then(([vendor, vendorsRes, treatmentsRes]) => {
        setName(vendor.name);
        setDescription(vendor.description ?? '');
        setContactName(vendor.contactName ?? '');
        setContactEmail(vendor.contactEmail ?? '');
        setCountry(vendor.country ?? '');
        setDpaStatus(vendor.dpaStatus);
        setDpaSigned(toDateInput(vendor.dpaSigned));
        setDpaExpiry(toDateInput(vendor.dpaExpiry));
        setIsSubProcessor(vendor.isSubProcessor);
        setParentVendorId(vendor.parentVendorId ?? '');
        setTreatmentIds(vendor.treatments.map(link => link.treatmentId));
        setVendors(vendorsRes.data.filter(v => v.id !== id));
        setTreatments(treatmentsRes.data.map(tr => ({ id: tr.id, name: tr.name })));
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [id]);

  const toggleTreatment = useCallback((tid: string) => {
    setTreatmentIds(prev => {
      if (prev.includes(tid)) {
        return prev.filter(x => x !== tid);
      }
      return [...prev, tid];
    });
  }, []);

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

  return {
    fetching,
    vendors,
    treatments,
    values: {
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
    },
    handlers: {
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
      toggleTreatment,
    },
  };
}
