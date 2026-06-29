export interface CurrencyOption {
  code: string
  label: string
}

/**
 * Supported account currencies. Limited to two-decimal currencies for now so the
 * integer-pence (minor-unit) model holds. Zero-decimal currencies (e.g. JPY) and
 * three-decimal ones would need the minor-unit scale to vary per currency — see
 * docs/PLAN.md "deferred work".
 */
export const CURRENCIES: CurrencyOption[] = [
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'NZD', label: 'NZD — New Zealand Dollar' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'INR', label: 'INR — Indian Rupee' },
]

/** Hard fallback when the user's region is unknown or unsupported. */
export const DEFAULT_CURRENCY = 'USD'

/**
 * Region → currency for the currencies we support. An email address carries no
 * location, so we infer the region from the browser locale (e.g. `en-GB` → GB).
 */
const REGION_CURRENCY: Record<string, string> = {
  GB: 'GBP',
  US: 'USD',
  AU: 'AUD',
  NZ: 'NZD',
  CA: 'CAD',
  CH: 'CHF',
  SG: 'SGD',
  ZA: 'ZAR',
  IN: 'INR',
  // Eurozone
  AT: 'EUR', BE: 'EUR', CY: 'EUR', DE: 'EUR', EE: 'EUR', ES: 'EUR', FI: 'EUR',
  FR: 'EUR', GR: 'EUR', IE: 'EUR', IT: 'EUR', LT: 'EUR', LU: 'EUR', LV: 'EUR',
  MT: 'EUR', NL: 'EUR', PT: 'EUR', SI: 'EUR', SK: 'EUR',
}

function detectRegion(): string | null {
  const lang = typeof navigator !== 'undefined' ? navigator.language : undefined
  if (!lang) return null
  try {
    const region = new Intl.Locale(lang).region
    if (region) return region.toUpperCase()
  } catch {
    // Intl.Locale unsupported — fall through to manual parse.
  }
  const parts = lang.split('-')
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : null
}

/**
 * Best-guess default currency from the browser's region, limited to the
 * supported set, defaulting to {@link DEFAULT_CURRENCY} (USD) when unknown.
 */
export function detectDefaultCurrency(): string {
  const region = detectRegion()
  const code = region ? REGION_CURRENCY[region] : undefined
  return code && CURRENCIES.some((c) => c.code === code) ? code : DEFAULT_CURRENCY
}
