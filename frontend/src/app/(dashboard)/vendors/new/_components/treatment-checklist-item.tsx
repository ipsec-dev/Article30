'use client';

interface TreatmentChecklistItemProps {
  id: string;
  name: string;
  checked: boolean;
  onToggle: (id: string) => void;
}

export function TreatmentChecklistItem({
  id,
  name,
  checked,
  onToggle,
}: Readonly<TreatmentChecklistItemProps>) {
  const handleChange = () => onToggle(id);
  return (
    <label className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[var(--surface-2)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="size-4 rounded border-[var(--a30-border)]"
      />
      {name}
    </label>
  );
}
