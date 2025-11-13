import { supabase } from "@/integrations/supabase/client";
import { mapCategoryToHierarchy, mapCategoryToSummaryField } from "./categoryMapper";

/**
 * Process powerbi_pnl_data into pnl_line_items and pnl_monthly_summary
 */
export async function processPowerBISummaries(
  locationId: string,
  year: number,
  month: number,
  importId: string
): Promise<{ lineItemsCount: number; summaryCount: number }> {
  console.log(`📊 Processing summaries for location=${locationId}, ${year}-${month}`);
  
  // Fetch raw data from powerbi_pnl_data
  const { data: rawData, error: fetchError } = await supabase
    .from("powerbi_pnl_data")
    .select("*")
    .eq("location_id", locationId)
    .eq("year", year)
    .eq("month", month);
  
  if (fetchError) throw new Error(`Failed to fetch raw data: ${fetchError.message}`);
  if (!rawData || rawData.length === 0) {
    console.log("⚠️ No raw data found to process");
    return { lineItemsCount: 0, summaryCount: 0 };
  }
  
  console.log(`✅ Fetched ${rawData.length} raw records`);
  
  // Build pnl_line_items records with hierarchy
  const lineItems = rawData.map(record => {
    const hierarchy = mapCategoryToHierarchy(record.category || "");
    const rawAmount = Number(record.amount || 0);
    
    // Revenue is positive in PowerBI, keep as-is
    // Costs/Expenses are negative in PowerBI, convert to positive by multiplying by -1
    const amount = hierarchy.level1 === "Revenue" ? rawAmount : -1 * rawAmount;
    
    return {
      location_id: record.location_id,
      import_id: record.import_id || importId,
      year: record.year,
      month: record.month,
      category_level_1: hierarchy.level1,
      category_level_2: hierarchy.level2,
      category_level_3: record.subcategory || hierarchy.level3,
      gl_account: record.gl_account || "",
      gl_description: record.category || "",
      amount: amount
    };
  });
  
  // Delete old line items for this period
  const { error: deleteLineError } = await supabase
    .from("pnl_line_items")
    .delete()
    .eq("location_id", locationId)
    .eq("year", year)
    .eq("month", month);
  
  if (deleteLineError) throw new Error(`Failed to delete old line items: ${deleteLineError.message}`);
  
  // Insert new line items
  const { error: insertLineError } = await supabase
    .from("pnl_line_items")
    .insert(lineItems);
  
  if (insertLineError) throw new Error(`Failed to insert line items: ${insertLineError.message}`);
  
  console.log(`✅ Inserted ${lineItems.length} line items`);
  
  // Build pnl_monthly_summary record with simplified schema
  const summary: any = {
    location_id: locationId,
    year,
    month,
    total_revenue: 0,
    total_costs: 0,
    gross_profit: 0,
    operating_expenses: 0,
    net_profit: 0
  };
  
  // Aggregate amounts into summary fields
  lineItems.forEach(item => {
    const amount = item.amount;
    
    switch (item.category_level_1) {
      case "Revenue":
        summary.total_revenue += amount;
        break;
      case "COGS":
        summary.total_costs += amount;
        break;
      case "Labor":
        summary.total_costs += amount;
        break;
      case "OPEX":
        summary.operating_expenses += amount;
        break;
      case "Depreciation":
        summary.operating_expenses += amount;
        break;
      case "Finance":
        summary.operating_expenses += amount;
        break;
    }
  });
  
  // Calculate derived fields
  summary.gross_profit = summary.total_revenue - summary.total_costs;
  summary.net_profit = summary.gross_profit - summary.operating_expenses;
  
  // Delete existing record first, then insert new one
  const { error: deleteError } = await supabase
    .from("pnl_monthly_summary")
    .delete()
    .eq("location_id", locationId)
    .eq("year", year)
    .eq("month", month);
  
  if (deleteError) throw new Error(`Failed to delete existing summary: ${deleteError.message}`);
  
  // Insert new summary record
  const { error: insertError } = await supabase
    .from("pnl_monthly_summary")
    .insert(summary);
  
  if (insertError) throw new Error(`Failed to insert summary: ${insertError.message}`);
  
  console.log(`✅ Upserted monthly summary for ${locationId}, ${year}-${month}`);
  
  return {
    lineItemsCount: lineItems.length,
    summaryCount: 1
  };
}

/**
 * Batch process multiple location/period combinations
 */
export async function batchProcessSummaries(
  combinations: Array<{ locationId: string; year: number; month: number; importId: string }>
): Promise<{ totalLineItems: number; totalSummaries: number }> {
  let totalLineItems = 0;
  let totalSummaries = 0;
  
  for (const combo of combinations) {
    try {
      const result = await processPowerBISummaries(
        combo.locationId,
        combo.year,
        combo.month,
        combo.importId
      );
      totalLineItems += result.lineItemsCount;
      totalSummaries += result.summaryCount;
    } catch (error) {
      console.error(`❌ Failed to process ${combo.locationId} ${combo.year}-${combo.month}:`, error);
      // Continue with next combination
    }
  }
  
  return { totalLineItems, totalSummaries };
}
