'use client';

import { useI18n } from '@/i18n/context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const DESCRIPTION_ROWS = 3;

interface BasicInfoFieldsProps {
  name: string;
  description: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export function BasicInfoFields({
  name,
  description,
  onNameChange,
  onDescriptionChange,
}: Readonly<BasicInfoFieldsProps>) {
  const { t } = useI18n();
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{t('vendor.name')}</Label>
        <Input id="name" value={name} onChange={onNameChange} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">{t('vendor.description')}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={onDescriptionChange}
          rows={DESCRIPTION_ROWS}
        />
      </div>
    </>
  );
}
