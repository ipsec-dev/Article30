'use client';

import { useI18n } from '@/i18n/context';
import { NotificationsCard } from '@/components/settings/notifications-card';
import { OrganizationInfoCard } from './_components/organization-info-card';
import { FreshnessConfigCard } from './_components/freshness-config-card';
import { GovernanceCard } from './_components/governance-card';
import { LanguageCard } from './_components/language-card';
import { RssFeedsCard } from './_components/rss-feeds-card';
import { useOrganizationSettings } from './_components/use-organization-settings';
import { useRssFeeds } from './_components/use-rss-feeds';
import type { OrgForm } from './_components/types';

const SAVING_ELLIPSIS = '...';
const SETTINGS_SAVE_SUCCESS_KEY = 'settings.saveSuccess';

export default function SettingsPage() {
  const { t } = useI18n();
  const org = useOrganizationSettings(t);
  const rss = useRssFeeds(t);

  const fields: { key: keyof OrgForm; label: string }[] = [
    { key: 'companyName', label: t('settings.companyName') },
    { key: 'siren', label: t('settings.siren') },
    { key: 'address', label: t('settings.address') },
    { key: 'representativeName', label: t('settings.representativeName') },
    { key: 'representativeRole', label: t('settings.representativeRole') },
    { key: 'dpoName', label: t('settings.dpoName') },
    { key: 'dpoEmail', label: t('settings.dpoEmail') },
    { key: 'dpoPhone', label: t('settings.dpoPhone') },
  ];

  const successText = t(SETTINGS_SAVE_SUCCESS_KEY);
  const messageClass = (value: string) =>
    value === successText ? 'text-green-600' : 'text-red-600';

  const saveText = t('settings.save');
  const saveLabel = org.saving ? SAVING_ELLIPSIS : saveText;
  const saveFreshnessLabel = org.savingFreshness ? SAVING_ELLIPSIS : saveText;
  const saveGovernanceLabel = org.savingGovernance ? SAVING_ELLIPSIS : saveText;
  const addFeedLabel = rss.addingFeed ? SAVING_ELLIPSIS : t('settings.addFeed');

  if (org.loading) {
    return (
      <div className="mt-8 flex justify-center">
        <div
          className="size-8 animate-spin rounded-full border-4"
          style={{ borderColor: 'var(--a30-border)', borderTopColor: 'var(--primary)' }}
        />
      </div>
    );
  }

  return (
    <div className="mt-6 max-w-2xl space-y-6">
      <OrganizationInfoCard
        form={org.form}
        fields={fields}
        message={org.message}
        messageClass={messageClass(org.message ?? '')}
        saving={org.saving}
        saveLabel={saveLabel}
        title={t('settings.organizationInfo')}
        annualTurnoverLabel={t('settings.annualTurnover')}
        annualTurnoverHint={t('settings.annualTurnoverHint')}
        onChange={org.handleChange}
        onAnnualTurnoverChange={org.handleAnnualTurnoverChange}
        onSave={org.handleSave}
      />

      <FreshnessConfigCard
        freshnessForm={org.freshnessForm}
        message={org.freshnessMessage}
        messageClass={messageClass(org.freshnessMessage ?? '')}
        saving={org.savingFreshness}
        saveLabel={saveFreshnessLabel}
        title={t('settings.freshnessConfig')}
        description={t('settings.freshnessConfigDescription')}
        thresholdLabel={t('settings.freshnessThreshold')}
        reviewCycleLabel={t('settings.reviewCycle')}
        onChange={org.handleFreshnessChange}
        onSave={org.handleFreshnessSave}
      />

      <GovernanceCard
        enforceSeparationOfDuties={org.enforceSeparationOfDuties}
        message={org.governanceMessage}
        messageClass={messageClass(org.governanceMessage ?? '')}
        saving={org.savingGovernance}
        saveLabel={saveGovernanceLabel}
        title={t('settings.governance.title')}
        description={t('settings.governance.description')}
        separationLabel={t('settings.governance.separationLabel')}
        separationHint={t('settings.governance.separationHint')}
        separationOffWarning={t('settings.governance.separationOffWarning')}
        onToggle={org.handleSeparationToggle}
        onSave={org.handleGovernanceSave}
      />

      <LanguageCard />

      <NotificationsCard />

      <RssFeedsCard
        feeds={rss.feeds}
        newFeedLabel={rss.newFeedLabel}
        newFeedUrl={rss.newFeedUrl}
        addingFeed={rss.addingFeed}
        feedMessage={rss.feedMessage}
        addFeedLabel={addFeedLabel}
        feedMessageClass={messageClass(rss.feedMessage ?? '')}
        onNewFeedLabelChange={rss.handleNewFeedLabelChange}
        onNewFeedUrlChange={rss.handleNewFeedUrlChange}
        onAddFeed={rss.handleAddFeed}
        onToggleFeed={rss.handleToggleFeed}
        onDeleteFeed={rss.handleDeleteFeed}
        t={t}
      />
    </div>
  );
}
