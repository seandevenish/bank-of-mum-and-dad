import type { Account, Transaction } from '../../types/models'

/**
 * Build a map of accountId -> current balance in minor units, computed as
 * `openingBalanceMinor + Σ transaction amounts`. Transactions for unknown
 * accounts are ignored. Accounts with no transactions still appear (at their
 * opening balance).
 */
export function computeBalances(
  accounts: Account[],
  transactions: Transaction[],
): Map<string, number> {
  const balances = new Map<string, number>()
  for (const account of accounts) {
    balances.set(account.id, account.openingBalanceMinor)
  }
  for (const txn of transactions) {
    if (!balances.has(txn.accountId)) continue
    balances.set(txn.accountId, (balances.get(txn.accountId) ?? 0) + txn.amountMinor)
  }
  return balances
}
