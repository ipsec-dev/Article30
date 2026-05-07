'use client';

import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RecitalDto, PaginatedResponse } from '@article30/shared';

type RecitalLang = 'fr' | 'en' | 'es' | 'de' | 'it';

const PAGE_LIMIT = 20;
const LANG_FR: RecitalLang = 'fr';

const LANGUAGES: { code: RecitalLang; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'de', label: 'DE' },
  { code: 'it', label: 'IT' },
];

function getRecitalContent(recital: RecitalDto, lang: RecitalLang): string {
  const map: Record<RecitalLang, string> = {
    fr: recital.contentFr,
    en: recital.contentEn,
    es: recital.contentEs,
    de: recital.contentDe,
    it: recital.contentIt,
  };
  return map[lang] || recital.contentFr;
}

interface LanguageButtonProps {
  lang: RecitalLang;
  current: RecitalLang;
  onSelect: (l: RecitalLang) => void;
  label: string;
}

function LanguageButton({ lang, current, onSelect, label }: Readonly<LanguageButtonProps>) {
  const handleClick = useCallback(() => onSelect(lang), [lang, onSelect]);
  let variant: 'default' | 'outline' = 'outline';
  if (lang === current) {
    variant = 'default';
  }
  return (
    <Button variant={variant} size="sm" onClick={handleClick}>
      {label}
    </Button>
  );
}

interface RecitalCardProps {
  recital: RecitalDto;
  lang: RecitalLang;
  t: (key: string) => string;
}

function RecitalCard({ recital, lang, t }: Readonly<RecitalCardProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('recitals.recitalNumber')} {recital.recitalNumber}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap text-[color:var(--ink)]">
          {getRecitalContent(recital, lang)}
        </p>
      </CardContent>
    </Card>
  );
}

export default function RecitalsPage() {
  const { t } = useI18n();
  const [recitals, setRecitals] = useState<RecitalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<RecitalLang>(LANG_FR);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchRecitals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<RecitalDto>>(
        `/recitals?page=${page}&limit=${PAGE_LIMIT}`,
      );
      setRecitals(res.data);
      setTotal(res.total);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchRecitals();
  }, [fetchRecitals]);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const trimmedSearch = search.trim();
  let filteredRecitals: RecitalDto[];
  if (trimmedSearch) {
    filteredRecitals = recitals.filter(r => String(r.recitalNumber).includes(trimmedSearch));
  } else {
    filteredRecitals = recitals;
  }

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handlePrev = useCallback(() => setPage(p => p - 1), []);
  const handleNext = useCallback(() => setPage(p => p + 1), []);

  let content: React.ReactNode;
  if (loading) {
    content = (
      <div className="flex justify-center py-8">
        <div className="size-8 animate-spin rounded-full border-4 border-[var(--surface-2)] border-t-[var(--ink)]" />
      </div>
    );
  } else if (filteredRecitals.length === 0) {
    content = (
      <p className="py-8 text-center text-sm text-[color:var(--ink)]">{t('recitals.noResults')}</p>
    );
  } else {
    content = (
      <div className="space-y-4">
        {filteredRecitals.map(recital => (
          <RecitalCard key={recital.id} recital={recital} lang={lang} t={t} />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 space-y-4">
          {/* Language selector */}
          <div className="flex items-center gap-2">
            {LANGUAGES.map(l => (
              <LanguageButton
                key={l.code}
                lang={l.code}
                current={lang}
                onSelect={setLang}
                label={l.label}
              />
            ))}
          </div>

          {/* Search */}
          <Input
            placeholder={t('recitals.searchPlaceholder')}
            value={search}
            onChange={handleSearchChange}
            className="max-w-xs bg-[var(--surface-2)] text-[color:var(--ink)] border-[var(--a30-border)]"
          />

          {content}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={handlePrev}>
                {t('recitals.previous')}
              </Button>
              <span className="text-sm text-[color:var(--ink)]">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={handleNext}
              >
                {t('recitals.next')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
