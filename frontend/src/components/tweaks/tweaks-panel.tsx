'use client';

import type { Tweaks, ThemeName, DensityName } from '@/lib/tweaks/use-tweaks';

interface TweaksPanelProps {
  tweaks: Tweaks;
  onChange: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
}

const THEME_OPTIONS: Array<{ value: ThemeName; label: string }> = [
  { value: 'ink', label: 'Indigo' },
  { value: 'forest', label: 'Forêt' },
  { value: 'sand', label: 'Sable' },
  { value: 'slate', label: 'Encre' },
];

const DENSITY_OPTIONS: Array<{ value: DensityName; label: string }> = [
  { value: 'comfortable', label: 'Confortable' },
  { value: 'compact', label: 'Compacte' },
];

export function TweaksPanel({ tweaks, onChange }: TweaksPanelProps) {
  return (
    <div className="a30-card overflow-hidden" role="group" aria-label="Préférences d'affichage">
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--a30-border)' }}>
        <div
          className="mb-3 text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--ink-3)' }}
        >
          Thème
        </div>
        <div className="flex flex-wrap gap-3">
          {THEME_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className="inline-flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-[13px]"
              style={{
                background: tweaks.theme === opt.value ? 'var(--primary-50)' : 'var(--surface-2)',
                color: tweaks.theme === opt.value ? 'var(--primary-600)' : 'var(--ink-2)',
                border: `1px solid ${tweaks.theme === opt.value ? 'var(--primary)' : 'var(--a30-border)'}`,
              }}
            >
              <input
                type="radio"
                name="tweaks-theme"
                value={opt.value}
                checked={tweaks.theme === opt.value}
                onChange={() => onChange('theme', opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--a30-border)' }}
      >
        <div>
          <div className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
            Mode sombre
          </div>
          <div className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
            Active une palette adaptée aux environnements peu éclairés.
          </div>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={tweaks.dark}
            onChange={e => onChange('dark', e.target.checked)}
            className="sr-only"
          />
          <span
            aria-hidden="true"
            className="block h-6 w-11 rounded-full transition-colors"
            style={{
              background: tweaks.dark ? 'var(--primary)' : 'var(--surface-2)',
              border: '1px solid var(--a30-border)',
            }}
          />
          <span
            aria-hidden="true"
            className="absolute left-0.5 top-0.5 block size-5 rounded-full bg-white shadow transition-transform"
            style={{ transform: tweaks.dark ? 'translateX(20px)' : 'translateX(0)' }}
          />
        </label>
      </div>

      <div className="px-5 py-4">
        <div
          className="mb-3 text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--ink-3)' }}
        >
          Densité
        </div>
        <div className="flex flex-wrap gap-3">
          {DENSITY_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className="inline-flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-[13px]"
              style={{
                background: tweaks.density === opt.value ? 'var(--primary-50)' : 'var(--surface-2)',
                color: tweaks.density === opt.value ? 'var(--primary-600)' : 'var(--ink-2)',
                border: `1px solid ${tweaks.density === opt.value ? 'var(--primary)' : 'var(--a30-border)'}`,
              }}
            >
              <input
                type="radio"
                name="tweaks-density"
                value={opt.value}
                checked={tweaks.density === opt.value}
                onChange={() => onChange('density', opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
