import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';

interface TopbarProps {
  title: string;
  breadcrumb?: string[];
  description?: string;
  onMenu?: () => void;
  children?: ReactNode;
}

export function Topbar({ title, breadcrumb = [], description, onMenu, children }: TopbarProps) {
  return (
    <header
      className="sticky top-0 z-20"
      style={{ background: 'var(--bg)', borderBottom: '1px solid var(--a30-border)' }}
    >
      <div className="flex items-center gap-4 px-6 py-3 lg:px-10">
        {onMenu && (
          <button
            type="button"
            onClick={onMenu}
            aria-label="Ouvrir le menu"
            className="-ml-1.5 p-1.5 md:hidden"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {breadcrumb.length > 0 && (
            <nav
              aria-label="fil d'Ariane"
              className="flex items-center gap-1.5 text-[11px]"
              style={{ color: 'var(--ink-3)' }}
            >
              {breadcrumb.map((segment, i) => (
                <span key={`${segment}-${i}`} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  <span>{segment}</span>
                </span>
              ))}
            </nav>
          )}
          <h1
            className="truncate text-[20px] font-semibold leading-tight"
            style={{ color: 'var(--ink)' }}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 truncate text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
