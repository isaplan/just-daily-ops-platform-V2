// Field synonym lists for intelligent matching
export const FIELD_SYNONYMS: Record<string, string[]> = {
  // Bork Sales
  product_name: ['product', 'item', 'artikel', 'omschrijving', 'naam', 'productnaam', 'artikelnaam', 'description', 'productomschrijving'],
  date: ['datum', 'date', 'ticket_datum', 'dag', 'ticketdatum', 'transactiedatum', 'transaction_date', 'datum'],
  quantity: ['aantal', 'quantity', 'qty', 'hoeveel', 'stuks', 'hoeveelheid'],
  price: ['prijs', 'price', 'unit_price', 'stuksprijs', 'eenheidsprijs', 'verkoopprijs'],
  revenue: ['omzet', 'revenue', 'amount', 'bedrag', 'netto_omzet', 'totaal', 'total', 'bruto_omzet', 'gerealiseerde_omzet', 'gerealiseerde omzet', 'realized_revenue'],
  category: ['categorie', 'category', 'groep', 'productgroep', 'artikelgroep', 'rgs_schema_rgsniveau2', 'rgsniveau2', 'rgs_niveau2'],
  
  // Eitje Labor
  employee_name: ['employee', 'medewerker', 'naam', 'name', 'werknemer', 'persoon', 'employee_name', 'employeename', 'medewerker_naam'],
  team_name: [
    'team', 'afdeling', 'department', 'groep', 'teamname', 'team_name', 'team_naam', 'functie',
    'omzetgroep', 'omzetgroep_naam', 'omzetgroep naam', 'revenue_group', 'revenuegroup',
    'naam_van_team', 'teamnaam', 'naam van team'
  ],
  hours: ['uren', 'hours', 'gewerkte_uren', 'worked_hours', 'aantal_uren', 'totaal_uren', 'total_hours'],
  shift_type: ['shift', 'dienst', 'diensttype', 'shift_type', 'shifttype', 'type', 'soort'],
  // Fully-loaded labor cost (includes overhead, taxes, benefits)
  hourly_rate: [
    'loonkosten_per_uur', 'loonkosten per uur', 'hourly_rate', 'tarief', 'rate', 
    'fully_loaded_rate', 'total_hourly_cost', 'kosten_per_uur', 'loaded_rate'
  ],
  // Base wage (gross pay before overhead)
  base_hourly_wage: [
    'uurloon', 'base_wage', 'hourly_wage', 'gross_wage', 'bruto_uurloon', 
    'basisloon', 'base_hourly_wage', 'wage', 'loon'
  ],
  labor_cost: [
    'loonkosten', 'labor_cost', 'kosten', 'cost', 'personeelskosten', 'labor_costs', 'laborcost',
    'gerealiseerde_loonkosten', 'gerealiseerde loonkosten', 'realized_labor_cost', 'totale_loonkosten'
  ],
  contract_type: ['contract', 'contracttype', 'contract_type', 'dienstverband', 'contractsoort'],
  
  // Eitje Productivity (with full Dutch headers from actual exports)
  hours_worked: [
    'uren', 'hours', 'gewerkte_uren', 'worked_hours', 'totaal_uren', 'totale_uren', 'hours_worked', 'hoursworked',
    'gewerkte uren', 'worked hours', 'total_hours'
  ],
  labor_cost_percentage: [
    'loonkosten_percentage', 'labor_percentage', 'percentage', 'kosten_percentage', 'labor_cost_percentage',
    'gerealiseerde_loonkosten_percentage', 'gerealiseerde loonkosten percentage', 'gerealiseerde loonkosten',
    'labor_cost_%', 'loonkosten_%', 'labor_%'
  ],
  productivity_per_hour: [
    'productiviteit', 'productivity', 'omzet_per_uur', 'productivity_per_hour', 'productiviteit_per_uur',
    'gerealiseerde_arbeidsproductiviteit', 'gerealiseerde arbeidsproductiviteit', 'realized_productivity', 
    'arbeidsproductiviteit', 'hourly_productivity'
  ],
  
  // Location field (for per-row location extraction)
  location_name: [
    'locatie', 'location', 'vestiging', 'naam_van_vestiging', 'naam van vestiging', 
    'vestigingsnaam', 'locationname', 'location_name'
  ],
  
  // PowerBI P&L
  year: ['jaar', 'year', 'jaartal', 'boekjaar', 'kalender2_jaar', 'kalender2[jaar]', 'kalender2'],
  month: ['maand', 'month', 'periode', 'maandnummer', 'mnd'],
  gl_account: ['grootboek', 'gl_account', 'account', 'rekeningnummer', 'rgs', 'grootboeknummer', 'grootboekrekening'],
  subcategory: ['subcategorie', 'subcategory', 'sub_category', 'subrubriek', 'subgroep', 'rgs_schema_rgsniveau3', 'rgsniveau3', 'rgs_niveau3'],
  amount: ['bedrag', 'amount', 'waarde', 'value', 'saldo', 'totaal', 'forecast']
};
