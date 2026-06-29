import { describe, expect, it } from 'vitest'
import { computeBalances } from './balances'
import type { Account, Transaction } from '../../types/models'

function account(id: string, openingBalanceMinor: number): Account {
  return {
    id,
    name: id,
    groupId: 'g1',
    currency: 'GBP',
    openingBalanceMinor,
    archived: false,
    createdAt: 0,
  }
}

function txn(accountId: string, amountMinor: number): Transaction {
  return {
    id: `${accountId}-${amountMinor}`,
    accountId,
    groupId: 'g1',
    date: '2026-06-29',
    description: 'x',
    amountMinor,
    source: 'manual',
    createdAt: 0,
    createdByUid: 'u1',
  }
}

describe('computeBalances', () => {
  it('starts each account at its opening balance', () => {
    const balances = computeBalances([account('a', 1000)], [])
    expect(balances.get('a')).toBe(1000)
  })

  it('adds signed transaction amounts to the opening balance', () => {
    const balances = computeBalances(
      [account('a', 1000)],
      [txn('a', 500), txn('a', -250)],
    )
    expect(balances.get('a')).toBe(1250)
  })

  it('keeps accounts independent and ignores unknown accounts', () => {
    const balances = computeBalances(
      [account('a', 0), account('b', 100)],
      [txn('a', 500), txn('ghost', 9999)],
    )
    expect(balances.get('a')).toBe(500)
    expect(balances.get('b')).toBe(100)
    expect(balances.has('ghost')).toBe(false)
  })
})
