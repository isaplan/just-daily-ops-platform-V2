/**
 * Productivity - Main Page
 * Shows links to nested pages for each view
 */

import Link from 'next/link';
import { getBreadcrumb } from '@/lib/navigation/breadcrumb-registry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const revalidate = 1800;

export default function ProductivityPage() {
  const pageMetadata = getBreadcrumb('/data/labor/productivity');

  return (
    <div className="container mx-auto py-6 space-y-6">
      {pageMetadata && (
        <div className="pt-20 space-y-1">
          <h1 className="text-2xl font-semibold">{pageMetadata.label}</h1>
          {pageMetadata.subtitle && (
            <p className="text-sm text-muted-foreground">{pageMetadata.subtitle}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Link href="/data/labor/productivity/by-location">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle>By Location</CardTitle>
              <CardDescription>Productivity metrics grouped by location</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View hours, costs, revenue, and productivity metrics per location per day.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/data/labor/productivity/by-division">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle>By Division</CardTitle>
              <CardDescription>Productivity metrics grouped by division (Food/Beverage/Management)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View productivity breakdown by division: Food, Beverage, Management, and Other.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/data/labor/productivity/by-team">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle>By Team</CardTitle>
              <CardDescription>Productivity metrics grouped by team category</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View productivity by team category: Kitchen, Service, Management, and Other with sub-teams.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/data/labor/productivity/by-worker">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle>By Worker</CardTitle>
              <CardDescription>Productivity metrics per worker per day</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View individual worker productivity: hours, costs, and revenue per worker per day.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
