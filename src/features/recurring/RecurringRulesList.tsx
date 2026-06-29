import { formatMoney } from '../../lib/money'
import { formatIsoDate } from '../../lib/dates'
import type { RecurringInterval, RecurringRule } from '../../types/models'

const INTERVAL_LABEL: Record<RecurringInterval, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
}

export function RecurringRulesList({
  rules,
  currency,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  rules: RecurringRule[]
  currency: string
  onEdit: (rule: RecurringRule) => void
  onToggleActive: (rule: RecurringRule) => void
  onDelete: (rule: RecurringRule) => void
}) {
  if (rules.length === 0) return null

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {rules.map((rule) => {
        const credit = rule.amountMinor >= 0
        return (
          <li key={rule.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {rule.description}
                {!rule.active && (
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-500">
                    paused
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400">
                {INTERVAL_LABEL[rule.interval]}
                {rule.active && ` · next ${formatIsoDate(rule.nextRunDate)}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`font-semibold tabular-nums ${credit ? 'text-green-700' : 'text-red-700'}`}
              >
                {credit ? '+' : '−'}
                {formatMoney(Math.abs(rule.amountMinor), currency).replace('-', '')}
              </span>
              <div className="flex items-center gap-1 text-sm">
                <button
                  type="button"
                  onClick={() => onToggleActive(rule)}
                  className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-50"
                >
                  {rule.active ? 'Pause' : 'Resume'}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(rule)}
                  className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(rule)}
                  className="rounded-lg px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
