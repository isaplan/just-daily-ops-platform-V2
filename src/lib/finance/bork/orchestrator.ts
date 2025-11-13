import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { processWithMapping as processV2 } from "../universal/orchestrator";

/**
 * Processes Bork sales data
 * Steps: Delete existing data → Find header row → Parse records → Insert in batches
 */
export const processBorkSales = async (
  workbook: XLSX.WorkBook,
  importId: string,
  locationId: string
): Promise<{ processedCount: number }> => {
  // Delete existing data for this import (in case of re-upload)
  const { error: deleteError } = await supabase
    .from('bork_sales_data')
    .delete()
    .eq('import_id', importId);
  
  if (deleteError) {
    console.error("Error deleting existing Bork sales data:", deleteError);
    throw deleteError;
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Find header row (contains "product" or "item")
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(50, jsonData.length); i++) {
    const row = jsonData[i];
    if (row && Array.isArray(row)) {
      // Look for Bork-specific headers (more flexible matching)
      const hasRelevantHeaders = row.some((cell: any) => {
        if (typeof cell !== 'string') return false;
        const lowerCell = cell.toLowerCase();
        return (
          lowerCell.includes('product') || 
          lowerCell.includes('item') ||
          lowerCell.includes('aantal') || // Dutch for quantity
          lowerCell.includes('quantity') ||
          lowerCell.includes('omzet') ||  // Dutch for revenue
          lowerCell.includes('revenue') ||
          lowerCell.includes('categor') ||
          lowerCell.includes('datum') ||  // Dutch for date
          lowerCell.includes('date')
        );
      });
      
      if (hasRelevantHeaders) {
        headerRowIndex = i;
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    throw new Error("Could not find header row in Bork Sales file");
  }

  const headers = jsonData[headerRowIndex] as string[];
  const dataRows = jsonData.slice(headerRowIndex + 1);

  // Map known columns and store rest in raw_data
  const records = dataRows
    .filter(row => row && row.length > 0)
    .map((row: any[]) => {
      const record: any = { 
        import_id: importId, 
        location_id: locationId,
        raw_data: {} 
      };

      const includesAny = (h: string, parts: string[]) =>
        parts.some(p => h.includes(p));

      const parseNumber = (v: any): number | null => {
        if (v === null || v === undefined || v === '') return null;
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
          const cleaned = v.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.-]/g, '');
          const n = parseFloat(cleaned);
          return isNaN(n) ? null : n;
        }
        return null;
      };

      const toDateString = (y: number, m: number, d: number) =>
        `${y.toString().padStart(4,'0')}-${m.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;

      const parseDateValue = (v: any): string | null => {
        if (v === null || v === undefined || v === '') return null;
        if (typeof v === 'number') {
          try {
            // Excel serial date
            // Prefer SSF if available
            // @ts-expect-error: XLSX.SSF is present at runtime but not typed in the package
            const parsed = XLSX.SSF && XLSX.SSF.parse_date_code ? XLSX.SSF.parse_date_code(v) : null;
            if (parsed) {
              return toDateString(parsed.y, parsed.m, parsed.d);
            }
            const epoch = new Date(Math.round((v - 25569) * 86400 * 1000));
            return toDateString(epoch.getUTCFullYear(), epoch.getUTCMonth() + 1, epoch.getUTCDate());
          } catch {
            return null;
          }
        }
        if (typeof v === 'string') {
          const s = v.trim();
          let m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
          if (m) {
            const d = parseInt(m[1],10), mo = parseInt(m[2],10), y = parseInt(m[3],10);
            return toDateString(y, mo, d);
          }
          m = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
          if (m) {
            const y = parseInt(m[1],10), mo = parseInt(m[2],10), d = parseInt(m[3],10);
            return toDateString(y, mo, d);
          }
          const dt = new Date(s);
          if (!isNaN(dt.getTime())) {
            return toDateString(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
          }
        }
        return null;
      };
      
      headers.forEach((header, index) => {
        const h = (header ?? '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const value = row[index];
        
        // Map to known columns with broader synonyms
        if (includesAny(h, ['product', 'item', 'artikel', 'omschrijving', 'naam', 'productnaam', 'artikelnaam'])) {
          record.product_name = value?.toString().trim();
        } else if (includesAny(h, ['category', 'categorie', 'categor'])) {
          record.category = value?.toString().trim();
        } else if (includesAny(h, ['quantity', 'aantal', 'qty', 'hoeveel'])) {
          const n = parseNumber(value);
          if (n !== null) record.quantity = n;
        } else if (includesAny(h, ['price', 'prijs', 'unit_price'])) {
          const n = parseNumber(value);
          if (n !== null) record.price = n;
        } else if (includesAny(h, ['revenue', 'omzet', 'amount', 'bedrag', 'netto_omzet', 'bruto_omzet'])) {
          const n = parseNumber(value);
          if (n !== null) record.revenue = n;
        } else if (includesAny(h, ['date', 'datum', 'ticket_datum', 'dag'])) {
          const d = parseDateValue(value);
          if (d) record.date = d;
        } else {
          // Store unknown columns in raw_data
          record.raw_data[h] = value;
        }
      });

      // Fallbacks if columns were named differently
      if (!record.product_name) {
        const alt = record.raw_data['omschrijving'] || record.raw_data['artikel'] || record.raw_data['naam'];
        if (alt) record.product_name = alt?.toString().trim();
      }
      if (!record.date) {
        const altDate = parseDateValue(record.raw_data['datum'] ?? record.raw_data['date']);
        if (altDate) record.date = altDate;
      }

      // Only return valid rows to avoid NOT NULL insert errors
      if (!record.product_name || !record.date) {
        return null;
      }
      
      return record;
    })
    .filter((r: any) => !!r);

  // Insert in batches
  const batchSize = 500;
  let processedCount = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('bork_sales_data')
      .insert(batch);

    if (insertError) {
      console.error("Error inserting Bork sales data:", insertError);
      throw insertError;
    }
    processedCount += batch.length;
  }

  return { processedCount };
};
