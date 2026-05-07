'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SyncToolbarProps = Readonly<{
  syncing: boolean;
  syncMessage: string | null;
  t: (key: string) => string;
  onSync: () => void;
}>;

export function SyncToolbar({ syncing, syncMessage, t, onSync }: SyncToolbarProps) {
  let syncButtonLabel;
  if (syncing) {
    syncButtonLabel = t('regulatory.syncing');
  } else {
    syncButtonLabel = t('regulatory.sync');
  }

  let syncSpinClass = '';
  if (syncing) {
    syncSpinClass = 'animate-spin';
  }

  return (
    <>
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={onSync} disabled={syncing}>
          <RefreshCw className={`mr-1.5 size-4 ${syncSpinClass}`} />
          {syncButtonLabel}
        </Button>
      </div>

      {syncMessage && <p className="mt-2 text-sm text-green-600">{syncMessage}</p>}
    </>
  );
}
