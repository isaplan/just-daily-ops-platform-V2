import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

export interface LaborMetrics {
  plannedHours: number;
  workedHours: number;
  plannedCost: number;
  workedCost: number;
  plannedEmployees: number;
  activeEmployees: number;
  totalEmployeesWorked: number;
  laborProductivity: number; // Revenue per labor hour
  hourlyProductivity: Record<string, number>; // Productivity by hour of day
  shiftProductivity: {
    shift: string;
    timeRange: string;
    topWorkers: Array<{
      name: string;
      productivity: number;
      hours: number;
      revenue: number;
    }>;
  }[];
}

interface LaborDataParams {
  locationId?: string;
  startDate?: Date;
  endDate?: Date;
}

export function useLaborData({ locationId, startDate, endDate }: LaborDataParams = {}) {
  return useQuery({
    queryKey: ['labor-data', locationId, startDate, endDate],
    queryFn: async () => {
      const supabase = createClient();
      const start = startDate || startOfMonth(new Date());
      const end = endDate || endOfMonth(new Date());
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      // Fetch planning shifts
      let planningQuery = supabase
        .from('eitje_planning_shifts')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr);

      if (locationId) {
        planningQuery = planningQuery.eq('location_id', locationId);
      }

      const { data: planningShifts, error: planningError } = await planningQuery;
      if (planningError) throw planningError;
      console.log('[useLaborData] Planning shifts:', planningShifts?.length || 0, 'records');

      // Fetch time registration shifts (actual worked)
      let timeRegQuery = supabase
        .from('eitje_time_registration_shifts')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr);

      if (locationId) {
        timeRegQuery = timeRegQuery.eq('location_id', locationId);
      }

      const { data: timeRegShifts, error: timeRegError } = await timeRegQuery;
      if (timeRegError) throw timeRegError;
      console.log('[useLaborData] Time registration shifts:', timeRegShifts?.length || 0, 'records');

      // Fetch sales data for productivity calculations
      let salesQuery = supabase
        .from('sales_import_items')
        .select(`
          *,
          sales_imports!inner(
            location_id,
            sales_date
          )
        `)
        .gte('sales_imports.sales_date', startStr)
        .lte('sales_imports.sales_date', endStr);

      if (locationId) {
        salesQuery = salesQuery.eq('sales_imports.location_id', locationId);
      }

      const { data: salesData, error: salesError } = await salesQuery;
      if (salesError) throw salesError;
      console.log('[useLaborData] Sales items:', salesData?.length || 0, 'records');

      // Fetch user names
      const userIds = [...new Set([
        ...(timeRegShifts?.map(s => s.eitje_user_id).filter(Boolean) || []),
        ...(planningShifts?.map(s => s.eitje_user_id).filter(Boolean) || [])
      ])];

      const { data: users } = await supabase
        .from('eitje_users')
        .select('eitje_user_id, name')
        .in('eitje_user_id', userIds);

      const userMap = new Map(users?.map(u => [u.eitje_user_id, u.name]) || []);

      // Calculate metrics
      const plannedHours = planningShifts?.reduce((sum, s) => sum + (Number(s.hours_worked) || 0), 0) || 0;
      const workedHours = timeRegShifts?.reduce((sum, s) => sum + (Number(s.hours_worked) || 0), 0) || 0;
      const plannedCost = planningShifts?.reduce((sum, s) => sum + (Number(s.wage_cost) || 0), 0) || 0;
      const workedCost = timeRegShifts?.reduce((sum, s) => sum + (Number(s.wage_cost) || 0), 0) || 0;

      const plannedEmployees = new Set(planningShifts?.map(s => s.eitje_user_id).filter(Boolean)).size;
      const activeEmployees = new Set(timeRegShifts?.map(s => s.eitje_user_id).filter(Boolean)).size;
      const totalEmployeesWorked = activeEmployees;

      // Calculate total revenue
      const totalRevenue = salesData?.reduce((sum, item) => {
        return sum + (Number(item.total_price_inc_btw) || 0);
      }, 0) || 0;

      const laborProductivity = workedHours > 0 ? totalRevenue / workedHours : 0;

      console.log('[useLaborData] Metrics:', {
        plannedHours,
        workedHours,
        plannedCost,
        workedCost,
        totalRevenue,
        laborProductivity,
        plannedEmployees,
        activeEmployees
      });

      // Calculate hourly productivity
      const hourlyProductivity: Record<string, number> = {};
      const hourlyRevenue: Record<string, number> = {};
      const hourlyHours: Record<string, number> = {};

      salesData?.forEach(item => {
        if (item.sale_timestamp) {
          const hour = new Date(item.sale_timestamp).getHours().toString();
          hourlyRevenue[hour] = (hourlyRevenue[hour] || 0) + (Number(item.total_price_inc_btw) || 0);
        }
      });

      timeRegShifts?.forEach(shift => {
        if (shift.start_time && shift.end_time) {
          const [startHour] = shift.start_time.split(':').map(Number);
          const [endHour] = shift.end_time.split(':').map(Number);
          const hours = Number(shift.hours_worked) || 0;
          
          for (let h = startHour; h <= endHour; h++) {
            const hourStr = (h % 24).toString();
            hourlyHours[hourStr] = (hourlyHours[hourStr] || 0) + (hours / (endHour - startHour + 1));
          }
        }
      });

      Object.keys(hourlyRevenue).forEach(hour => {
        if (hourlyHours[hour] > 0) {
          hourlyProductivity[hour] = hourlyRevenue[hour] / hourlyHours[hour];
        }
      });

      // Calculate shift productivity
      const shifts = [
        { name: 'Shift 1', start: 10, end: 19, id: 'shift1' },
        { name: 'Shift 2', start: 12, end: 22, id: 'shift2' },
        { name: 'Shift 3', start: 16, end: 25, id: 'shift3' }, // 25 = 1 AM next day
        { name: 'Shift 4', start: 18, end: 27, id: 'shift4' }, // 27 = 3 AM next day
      ];

      const shiftProductivity = shifts.map(shift => {
        const workerStats = new Map<number, { hours: number; revenue: number; name: string }>();

        timeRegShifts?.forEach(s => {
          if (!s.start_time || !s.end_time || !s.eitje_user_id) return;

          const [startHour] = s.start_time.split(':').map(Number);
          const [endHour] = s.end_time.split(':').map(Number);
          const adjustedEndHour = endHour < startHour ? endHour + 24 : endHour;

          // Check if shift overlaps with our defined shift
          if (startHour >= shift.start && adjustedEndHour <= shift.end) {
            const hours = Number(s.hours_worked) || 0;
            const current = workerStats.get(s.eitje_user_id) || { hours: 0, revenue: 0, name: userMap.get(s.eitje_user_id) || `User ${s.eitje_user_id}` };
            
            // Allocate revenue proportionally
            const shiftRevenue = (totalRevenue / (workedHours || 1)) * hours;
            
            workerStats.set(s.eitje_user_id, {
              hours: current.hours + hours,
              revenue: current.revenue + shiftRevenue,
              name: current.name
            });
          }
        });

        const topWorkers = Array.from(workerStats.entries())
          .map(([userId, stats]) => ({
            name: stats.name,
            productivity: stats.hours > 0 ? stats.revenue / stats.hours : 0,
            hours: stats.hours,
            revenue: stats.revenue
          }))
          .sort((a, b) => b.productivity - a.productivity)
          .slice(0, 3);

        const endTime = shift.end > 24 ? `0${shift.end - 24}:00` : `${shift.end}:00`;
        return {
          shift: shift.name,
          timeRange: `${shift.start}:00 - ${endTime}`,
          topWorkers
        };
      });

      return {
        plannedHours,
        workedHours,
        plannedCost,
        workedCost,
        plannedEmployees,
        activeEmployees,
        totalEmployeesWorked,
        laborProductivity,
        hourlyProductivity,
        shiftProductivity
      } as LaborMetrics;
    },
    refetchInterval: 60000 // Refetch every minute
  });
}