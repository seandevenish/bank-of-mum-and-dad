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

export const DEFAULT_CURRENCY = 'GBP'
