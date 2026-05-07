'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n/context';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { GLOSSARY } from '@article30/shared';
import type { GlossaryCategory, GlossaryEntry } from '@article30/shared';

type Locale = 'fr' | 'en';

const CATEGORIES: GlossaryCategory[] = ['acronym', 'concept', 'role', 'process', 'framework'];

const CATEGORY_KEY_MAP: Record<GlossaryCategory, string> = {
  acronym: 'glossary.category.acronym',
  concept: 'glossary.category.concept',
  role: 'glossary.category.role',
  process: 'glossary.category.process',
  framework: 'glossary.category.framework',
};

const CATEGORY_STYLE: Record<GlossaryCategory, React.CSSProperties> = {
  acronym: { background: 'rgba(99,102,241,.15)', color: '#818cf8' },
  concept: { background: 'rgba(16,185,129,.15)', color: '#34d399' },
  role: { background: 'rgba(245,158,11,.15)', color: '#fbbf24' },
  process: { background: 'rgba(59,130,246,.15)', color: '#60a5fa' },
  framework: { background: 'rgba(168,85,247,.15)', color: '#c084fc' },
};

function matchesSearch(entry: GlossaryEntry, locale: Locale, query: string): boolean {
  const q = query.toLowerCase();
  if (entry.term[locale].toLowerCase().includes(q)) return true;
  if (entry.definition[locale].toLowerCase().includes(q)) return true;
  if (entry.aliases?.some(a => a.toLowerCase().includes(q))) return true;
  return false;
}

interface CategoryFilterProps {
  active: GlossaryCategory | null;
  onChange: (cat: GlossaryCategory | null) => void;
  t: (key: string) => string;
}

function CategoryFilter({ active, onChange, t }: Readonly<CategoryFilterProps>) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
        style={
          active === null
            ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }
            : {
                background: 'transparent',
                color: 'var(--ink-3)',
                borderColor: 'var(--a30-border)',
              }
        }
      >
        {t('glossary.category.all')}
      </button>
      {CATEGORIES.map(cat => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat === active ? null : cat)}
          className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
          style={
            active === cat
              ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }
              : {
                  background: 'transparent',
                  color: 'var(--ink-3)',
                  borderColor: 'var(--a30-border)',
                }
          }
        >
          {t(CATEGORY_KEY_MAP[cat])}
        </button>
      ))}
    </div>
  );
}

interface EntryCardProps {
  entry: GlossaryEntry;
  locale: Locale;
  t: (key: string) => string;
}

function EntryCard({ entry, locale, t }: Readonly<EntryCardProps>) {
  const otherLocale: Locale = locale === 'fr' ? 'en' : 'fr';
  const hasCrossLocaleAlias = entry.term[otherLocale] !== entry.term[locale];

  return (
    <div
      id={entry.id}
      className="rounded-lg border p-4 transition-colors scroll-mt-4"
      style={{ borderColor: 'var(--a30-border)', background: 'var(--surface)' }}
    >
      <div className="mb-1 flex flex-wrap items-start gap-2">
        <h3 className="text-[15px] font-semibold leading-snug" style={{ color: 'var(--ink)' }}>
          {entry.term[locale]}
        </h3>
        <Badge
          variant="outline"
          className="shrink-0 border-0 px-2 py-0.5 text-[11px] font-medium"
          style={CATEGORY_STYLE[entry.category]}
        >
          {t(CATEGORY_KEY_MAP[entry.category])}
        </Badge>
      </div>

      {(entry.aliases?.length || hasCrossLocaleAlias) && (
        <p className="mb-2 text-[12px]" style={{ color: 'var(--ink-3)' }}>
          <span className="font-medium">{t('glossary.aliases')}</span>
          {[hasCrossLocaleAlias ? entry.term[otherLocale] : null, ...(entry.aliases ?? [])]
            .filter((v): v is string => v !== null)
            .join(', ')}
        </p>
      )}

      <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
        {entry.definition[locale]}
      </p>

      {entry.references && entry.references.length > 0 && (
        <p className="mt-2 text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
          <span className="font-medium">{t('glossary.references')} : </span>
          {entry.references.join(' · ')}
        </p>
      )}
    </div>
  );
}

export default function GlossaryPage() {
  const { t, locale } = useI18n();
  const safeLocale: Locale = locale === 'en' ? 'en' : 'fr';

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim();
    return GLOSSARY.filter(entry => {
      if (activeCategory && entry.category !== activeCategory) return false;
      if (q && !matchesSearch(entry, safeLocale, q)) return false;
      return true;
    });
  }, [search, activeCategory, safeLocale]);

  const grouped = useMemo(() => {
    const map = new Map<string, GlossaryEntry[]>();
    for (const entry of filtered) {
      const letter = entry.term[safeLocale].charAt(0).toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(entry);
    }
    // Sort map keys alphabetically
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, safeLocale]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Toolbar */}
      <div className="space-y-3">
        <Input
          type="search"
          placeholder={t('glossary.search.placeholder')}
          value={search}
          onChange={handleSearchChange}
          className="max-w-md"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--ink)' }}
        />
        <CategoryFilter active={activeCategory} onChange={setActiveCategory} t={t} />
      </div>

      {/* Letter groups */}
      {grouped.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
          {t('glossary.empty')}
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map(([letter, entries]) => (
            <section key={letter}>
              <div
                className="mb-3 text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--ink-3)' }}
              >
                {letter}
              </div>
              <div className="grid gap-3 sm:grid-cols-1">
                {entries.map(entry => (
                  <EntryCard key={entry.id} entry={entry} locale={safeLocale} t={t} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
