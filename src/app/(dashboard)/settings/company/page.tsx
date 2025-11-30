/**
 * Company Settings - Server Component
 * ✅ SSR with ISR
 */

import { CompanySettingsClient } from './CompanySettingsClient';
import { getCompanySettings } from '@/lib/services/graphql/queries';

export const revalidate = 1800; // 30 minutes

export default async function CompanySettingsPage() {
  const settings = await getCompanySettings().catch(() => ({
    id: 'default',
    workingDayStartHour: 6,
  }));

  return <CompanySettingsClient initialSettings={settings} />;
}

