'use client';

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ArticleDto, PaginatedResponse } from '@article30/shared';

type ArticleLang = 'fr' | 'en' | 'es' | 'de' | 'it';

const PAGE_LIMIT = 20;
const LANG_FR: ArticleLang = 'fr';

const LANGUAGES: { code: ArticleLang; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'de', label: 'DE' },
  { code: 'it', label: 'IT' },
];

function getArticleTitle(article: ArticleDto, lang: ArticleLang): string {
  if (lang === LANG_FR) {
    return article.titleFr;
  }
  return article.titleEn;
}

function getArticleContent(article: ArticleDto, lang: ArticleLang): string {
  const map: Record<ArticleLang, string> = {
    fr: article.contentFr,
    en: article.contentEn,
    es: article.contentEs,
    de: article.contentDe,
    it: article.contentIt,
  };
  return map[lang] || article.contentFr;
}

interface LanguageButtonProps {
  lang: ArticleLang;
  current: ArticleLang;
  onSelect: (l: ArticleLang) => void;
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

interface ArticleListItemProps {
  article: ArticleDto;
  lang: ArticleLang;
  selected: boolean;
  onSelect: (id: number) => void;
  t: (key: string) => string;
}

function ArticleListItem({ article, lang, selected, onSelect, t }: Readonly<ArticleListItemProps>) {
  const handleClick = useCallback(() => onSelect(article.id), [article.id, onSelect]);

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-4 py-3 border-l-4 transition-colors ${
        selected
          ? 'border-l-[var(--primary)] bg-[var(--surface-2)]'
          : 'border-l-[var(--a30-border)] hover:bg-[var(--surface-2)]'
      }`}
      style={{ color: 'var(--ink)' }}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium" style={{ color: 'var(--primary)' }}>
          {t('articles.articleNumber')} {article.articleNumber}
        </span>
        <span style={{ color: 'var(--ink-light)' }}>—</span>
      </div>
      <p className="text-sm truncate" style={{ color: 'var(--ink-secondary)' }}>
        {getArticleTitle(article, lang)}
      </p>
    </button>
  );
}

interface ArticleDetailPaneProps {
  article: ArticleDto | null;
  lang: ArticleLang;
  t: (key: string) => string;
}

function ArticleDetailPane({ article, lang, t }: Readonly<ArticleDetailPaneProps>) {
  if (!article) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: 'var(--ink-secondary)' }}
      >
        <p className="text-sm">{t('articles.noSelection')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="space-y-4">
        <div>
          <h2 className="mb-2 text-xl" style={{ color: 'var(--ink)' }}>
            {getArticleTitle(article, lang)}
          </h2>
          {article.chapter && (
            <p className="text-xs mt-2" style={{ color: 'var(--ink-secondary)' }}>
              {article.chapter}
            </p>
          )}
        </div>

        <div
          className="pt-4 border-t whitespace-pre-wrap text-sm"
          style={{
            borderColor: 'var(--a30-border)',
            color: 'var(--ink)',
          }}
        >
          {getArticleContent(article, lang)}
        </div>
      </div>
    </div>
  );
}

export default function ArticlesPage() {
  const { t } = useI18n();
  const [articles, setArticles] = useState<ArticleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<ArticleLang>(LANG_FR);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<ArticleDto>>(
        `/articles?page=${page}&limit=${PAGE_LIMIT}`,
      );
      setArticles(res.data);
      setTotal(res.total);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const trimmedSearch = search.trim();
  let filteredArticles: ArticleDto[];
  if (trimmedSearch) {
    filteredArticles = articles.filter(a => String(a.articleNumber).includes(trimmedSearch));
  } else {
    filteredArticles = articles;
  }

  const selectedArticle = articles.find(a => a.id === selectedArticleId) || null;

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handlePrev = useCallback(() => setPage(p => p - 1), []);
  const handleNext = useCallback(() => setPage(p => p + 1), []);

  const handleArticleSelect = useCallback((id: number) => {
    setSelectedArticleId(id);
  }, []);

  let listContent: React.ReactNode;
  if (loading) {
    listContent = (
      <div className="flex justify-center py-8">
        <div
          className="size-8 animate-spin rounded-full border-4 border-t-[var(--primary)]"
          style={{
            borderColor: 'var(--surface)',
            borderTopColor: 'currentColor',
          }}
        />
      </div>
    );
  } else if (filteredArticles.length === 0) {
    listContent = (
      <p className="py-8 text-center text-sm" style={{ color: 'var(--ink-secondary)' }}>
        {t('articles.noResults')}
      </p>
    );
  } else {
    listContent = (
      <div className="divide-y" style={{ borderColor: 'var(--a30-border)' }}>
        {filteredArticles.map(article => (
          <ArticleListItem
            key={article.id}
            article={article}
            lang={lang}
            selected={selectedArticleId === article.id}
            onSelect={handleArticleSelect}
            t={t}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--surface)' }}>
      {/* Header */}
      <div className="flex-none p-6 border-b" style={{ borderColor: 'var(--a30-border)' }}>
        {/* Language selector */}
        <div className="flex items-center gap-2 mb-4">
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
          placeholder={t('articles.searchPlaceholder')}
          value={search}
          onChange={handleSearchChange}
          className="max-w-xs"
          style={{
            backgroundColor: 'var(--surface-2)',
            color: 'var(--ink)',
          }}
        />
      </div>

      {/* Two-pane layout */}
      <div className="flex flex-1 min-h-0 gap-6 p-6">
        {/* List pane */}
        <div
          className="flex-none w-72 border rounded overflow-y-auto"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--a30-border)',
          }}
        >
          {listContent}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex-none border-t p-4 flex items-center justify-center gap-2"
              style={{ borderColor: 'var(--a30-border)' }}
            >
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={handlePrev}>
                {t('articles.previous')}
              </Button>
              <span className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={handleNext}
              >
                {t('articles.next')}
              </Button>
            </div>
          )}
        </div>

        {/* Detail pane */}
        <div
          className="flex-1 border rounded overflow-hidden"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--a30-border)',
          }}
        >
          <ArticleDetailPane article={selectedArticle} lang={lang} t={t} />
        </div>
      </div>
    </div>
  );
}
