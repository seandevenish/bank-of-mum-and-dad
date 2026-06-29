import { collection, doc, type CollectionReference, type DocumentReference } from 'firebase/firestore'
import { db } from '../firebase/config'

/** A subcollection under a household, e.g. groups / accounts / transactions. */
export function householdCollection(householdId: string, name: string): CollectionReference {
  return collection(db, 'households', householdId, name)
}

/** A specific document within a household subcollection. */
export function householdDoc(householdId: string, name: string, id: string): DocumentReference {
  return doc(db, 'households', householdId, name, id)
}
