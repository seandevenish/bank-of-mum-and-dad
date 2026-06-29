/**
 * Money helpers. All amounts are stored as an integer number of minor units
 * (pence). These functions convert to/from the human-facing major-unit strings.
 */

/** Format minor units (e.g. 1234) as a currency string (e.g. "£12.34"). */
export function formatMoney(minor: number, currency = 'GBP', locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100)
}

/**
 * Parse a user-entered amount (e.g. "12.34", "£12.34", "-5") into signed minor
 * units. Returns null when the input isn't a valid number.
 *
 * Parsing is done on the string (not via `value * 100`) so amounts round
 * exactly and floating-point representation errors can't shift the pence.
 * A third decimal place rounds half-up (e.g. "1.005" -> 101).
 */
export function parseMoneyToMinor(input: string): number | null {
  const cleaned = input.replace(/[^0-9.-]/g, '')
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(cleaned)
  if (!match) return null

  const [, sign, intPart, fracPart = ''] = match
  if (intPart === '' && fracPart === '') return null // '', '-', '.', '-.'

  const pounds = intPart === '' ? 0 : Number.parseInt(intPart, 10)
  let pence = 0
  if (fracPart.length > 0) {
    pence = Number.parseInt(fracPart.slice(0, 2).padEnd(2, '0'), 10)
    if (fracPart.length > 2 && Number(fracPart[2]) >= 5) pence += 1 // round half-up
  }

  const total = pounds * 100 + pence
  return sign === '-' ? -total : total
}

/** Convert minor units to a plain major-unit string for editing in inputs (e.g. "12.34"). */
export function minorToInput(minor: number): string {
  return (minor / 100).toFixed(2)
}
