'use client';

import { useI18n } from '@/i18n/context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ContactSectionProps {
  contactName: string;
  contactEmail: string;
  country: string;
  onContactNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onContactEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCountryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ContactSection({
  contactName,
  contactEmail,
  country,
  onContactNameChange,
  onContactEmailChange,
  onCountryChange,
}: Readonly<ContactSectionProps>) {
  const { t } = useI18n();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="contactName">{t('vendor.contactName')}</Label>
          <Input id="contactName" value={contactName} onChange={onContactNameChange} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contactEmail">{t('vendor.contactEmail')}</Label>
          <Input
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={onContactEmailChange}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="country">{t('vendor.country')}</Label>
        <Input id="country" value={country} onChange={onCountryChange} />
      </div>
    </>
  );
}
