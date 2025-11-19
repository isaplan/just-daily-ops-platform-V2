// Format date as DD.MM'YY
// Dates are stored as YYYY-MM-DD strings (UTC dates), display as-is since dates don't have timezones
export function formatDateDDMMYY(date: Date | string | null | undefined): string {
  if (!date) return "-";
  
  // If it's a string in YYYY-MM-DD format, parse it directly
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-');
    const yearShort = year.slice(-2);
    return `${day}.${month}'${yearShort}`;
  }
  
  // Otherwise, parse as Date object
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}.${month}'${year}`;
}

// Format time as HH:MM only (no date)
export function formatTimeOnly(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Format date as DD.MM'YY HH:MM
export function formatDateDDMMYYTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}'${year} ${hours}:${minutes}`;
}


