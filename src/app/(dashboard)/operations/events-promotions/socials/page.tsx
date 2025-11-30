/**
 * Socials - Instagram Promotions
 * Placeholder page for Instagram promotions functionality
 */

import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { Card, CardContent } from "@/components/ui/card";

export default function SocialsPage() {
  const pageMetadata = getBreadcrumb('/operations/events-promotions/socials');
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Title */}
      {pageMetadata && (
        <div className="pt-20 space-y-1">
          <h1 className="text-2xl font-semibold">{pageMetadata.label}</h1>
          {pageMetadata.subtitle && (
            <p className="text-sm text-muted-foreground">{pageMetadata.subtitle}</p>
          )}
        </div>
      )}
      
      {/* Placeholder Content */}
      <Card>
        <CardContent className="py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Instagram Promotions</h2>
          <p className="text-muted-foreground">Coming Soon</p>
        </CardContent>
      </Card>
    </div>
  );
}











