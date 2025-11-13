/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/finance/data
 */

/**
 * Finance Eitje Data Overview View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { useEitjeDataViewModel } from "@/viewmodels/finance/useEitjeDataViewModel";

export default function EitjeDataOverviewPage() {
  useEitjeDataViewModel(); // ViewModel ready for future use
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Eitje Data Overview</h1>
      <p>Select a section to view detailed data</p>
      <nav style={{ marginTop: '2rem' }}>
        <div><a href="/finance/data/eitje-data/hours">Hours</a></div>
        <div><a href="/finance/data/eitje-data/labor-costs">Labor Costs</a></div>
        <div><a href="/finance/data/eitje-data/finance">Sales by Bork</a></div>
        <div><a href="/finance/data/eitje-data/data-imported">Data Imported</a></div>
        <div><a href="/finance/data/eitje-data/workers">Workers</a></div>
        <div><a href="/finance/data/eitje-data/locations-teams">Locations & Teams</a></div>
      </nav>
    </div>
  );
}
