// ─── Types ────────────────────────────────────────────────────────────────────
export interface Country {
  slug:            string;
  name_en:         string;
  name_fr:         string;
  name_ar:         string;
  name_es:         string;
  flag:            string;
  currency:        string;
  currency_symbol: string;
  phone_code:      string;
  languages:       string[];
  timezone:        string;
  is_active:       boolean;
  display_order:   number;
}

export interface CityEntry {
  id?:     string;
  idx?:    number;
  slug:    string;
  name_en: string;
  name_fr: string;
  name_ar: string;
  name_es?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  lat?:    number;
  lng?:    number;
}

export interface ConciergePersona {
  name:       string;
  tagline_en: string;
  tagline_fr: string;
  tagline_ar: string;
  tagline_es: string;
}

export interface ConciergeConfig {
  country_slug:       string;
  persona:            ConciergePersona;
  system_context:     { en: string };
  greeting:           { en: string; fr: string; ar: string; es: string };
  suggested_questions:{ en: string[]; fr: string[]; ar: string[]; es: string[] };
}

export interface FlashPromoEntry {
  id: string;
  establishment_id: string;
  city_id: string;
  title: string;
  title_fr?: string;
  title_en?: string;
  title_ar?: string;
  title_es?: string;
  description?: string;
  description_fr?: string;
  description_en?: string;
  description_ar?: string;
  description_es?: string;
  discount_value: number;
  discount_type: 'percentage' | 'fixed';
  image?: string;
  starts_at: string;
  ends_at: string;
  is_exclusive: boolean;
  establishment_name?: string;
  max_uses?: number;
  current_uses?: number;
  target_audience?: 'all' | 'tourist' | 'local' | string;
  is_active?: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ─── Static loaders ───────────────────────────────────────────────────────────
// Require inline keeps Metro's static analysis happy — no dynamic require()

export function loadCountries(): Country[] {
  return require('../assets/data/global/countries.json') as Country[];
}

export function loadCountryCities(countrySlug: string): CityEntry[] {
  switch (countrySlug) {
    case 'morocco': return require('../assets/data/countries/morocco/cities.json') as CityEntry[];
    case 'usa':     return require('../assets/data/countries/usa/cities.json')     as CityEntry[];
    case 'canada':  return require('../assets/data/countries/canada/cities.json')  as CityEntry[];
    case 'mexico':  return require('../assets/data/countries/mexico/cities.json')  as CityEntry[];
    default:        return require('../assets/data/countries/morocco/cities.json') as CityEntry[];
  }
}

export function loadCountryConcierge(countrySlug: string): ConciergeConfig {
  switch (countrySlug) {
    case 'morocco': return require('../assets/data/countries/morocco/concierge.json') as ConciergeConfig;
    case 'usa':     return require('../assets/data/countries/usa/concierge.json')     as ConciergeConfig;
    case 'canada':  return require('../assets/data/countries/canada/concierge.json')  as ConciergeConfig;
    case 'mexico':  return require('../assets/data/countries/mexico/concierge.json')  as ConciergeConfig;
    default:        return require('../assets/data/countries/morocco/concierge.json') as ConciergeConfig;
  }
}

export function loadCountryPlaces(countrySlug: string): any[] {
  switch (countrySlug) {
    case 'morocco': return require('../assets/data/countries/morocco/places.json') as any[];
    case 'usa':
    case 'canada':
    case 'mexico':
    default:
      // Place catalogs for non-Morocco countries are not available yet.
      return [];
  }
}

export function loadCountryFlashPromos(countrySlug: string): FlashPromoEntry[] {
  switch (countrySlug) {
    case 'morocco': return require('../assets/data/countries/morocco/flashPromos.json') as FlashPromoEntry[];
    case 'usa':
    case 'canada':
    case 'mexico':
    default:
      return [];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getCountry(slug: string): Country | undefined {
  return loadCountries().find(c => c.slug === slug);
}

export function getCityName(
  cities: CityEntry[],
  slug: string,
  lang: string = 'en',
): string {
  const city = cities.find(c => c.slug === slug);
  if (!city) return slug;
  const key = `name_${lang}` as keyof CityEntry;
  return (city[key] as string) ?? city.name_en;
}
