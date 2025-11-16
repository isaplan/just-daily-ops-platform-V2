/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/lib/eitje/_backup_complex
 */

/**
 * EITJE API FIELD MAPPERS
 * 
 * Focused field mapping logic for Eitje API responses
 */

import { EitjeShiftResponse } from './types';

export class EitjeMappers {
  /**
   * DEFENSIVE: Map shift fields with fallbacks
   */
  static mapShiftFields(record: any): EitjeShiftResponse {
    return {
      id: record.id,
      date: record.date,
      user_id: record.user_id,
      team_id: record.team_id,
      environment_id: record.environment_id,
      
      // Time fields with fallbacks
      start_time: record.start_time || record.start || record.startDateTime,
      end_time: record.end_time || record.end || record.endDateTime,
      
      // Break fields with fallbacks
      break_minutes: record.break_minutes || record.breaks || record.breakMinutes,
      
      // Hours fields with fallbacks
      hours_worked: record.hours_worked || record.hours || record.totalHours,
      
      // Cost fields with fallbacks
      wage_cost: record.wage_cost || record.costs?.wage || record.wageCost,
      costs: record.costs,
      
      // Metadata
      status: record.status,
      skill_set: record.skill_set,
      shift_type: record.shift_type
    };
  }

  /**
   * DEFENSIVE: Map revenue fields with fallbacks
   */
  static mapRevenueFields(record: any): any {
    return {
      id: record.id,
      environment_id: record.environment_id,
      date: record.date,
      
      // Revenue fields with fallbacks
      total_revenue: record.total_revenue || record.revenue || record.total || 0,
      revenue_excl_vat: record.revenue_excl_vat || record.revenue_excluding_vat || record.excl_vat || 0,
      revenue_incl_vat: record.revenue_incl_vat || record.revenue_including_vat || record.incl_vat || 0,
      vat_amount: record.vat_amount || record.vat || record.tax_amount || 0,
      vat_rate: record.vat_rate || record.tax_rate || 0,
      
      // Transaction fields with fallbacks
      transaction_count: record.transaction_count || record.transactions || record.count || 0,
      avg_transaction_value: record.avg_transaction_value || record.avg_transaction || record.average_value || 0,
      
      // Payment method fields with fallbacks
      cash_revenue: record.cash_revenue || record.cash || 0,
      card_revenue: record.card_revenue || record.card || 0,
      digital_revenue: record.digital_revenue || record.digital || record.online || 0,
      other_revenue: record.other_revenue || record.other || 0,
      
      // Store complete raw data
      raw_data: record
    };
  }
}
