import { Reference } from "tripledoc";
import { VirtualSubject } from "../virtual/subject";
import { VirtualDocument } from "../virtual/document";

export type SubjectDescriptor =
  | ByRef
  | IsFoundIn<SubjectLocator>
  | IsEnsuredIn<SubjectLocator>;

export interface ByRef {
  type: "ByRef";
  reference: Reference;
}
export function internal_isByRef(
  virtualSubject: VirtualSubject
): virtualSubject is VirtualSubject<ByRef> {
  return virtualSubject.internal_descriptor.type === "ByRef";
}

export interface WithRefLocator {
  references: Array<{ predicate: Reference; object: Reference }>;
}
export interface AsRefLocator {
  reference: Reference;
}
export type SubjectLocator = WithRefLocator | AsRefLocator;
export function internal_isWithRefLocator(
  locator: SubjectLocator
): locator is WithRefLocator {
  return Array.isArray((locator as WithRefLocator).references);
}
export function internal_isAsRefLocator(
  locator: SubjectLocator
): locator is AsRefLocator {
  return typeof (locator as AsRefLocator).reference === "string";
}

export interface IsFoundIn<Locator extends SubjectLocator> {
  type: "IsFoundIn";
  document: VirtualDocument;
  locator: Locator;
}
export function internal_isIsFoundIn<Locator extends SubjectLocator>(
  virtualSubject: VirtualSubject
): virtualSubject is VirtualSubject<IsFoundIn<Locator>> {
  return virtualSubject.internal_descriptor.type === "IsFoundIn";
}

export interface IsEnsuredIn<Locator extends SubjectLocator | undefined> {
  type: "IsEnsuredIn";
  document: VirtualDocument;
  locator: Locator;
}
export function internal_isIsEnsuredIn<Locator extends SubjectLocator>(
  virtualSubject: VirtualSubject
): virtualSubject is VirtualSubject<IsEnsuredIn<Locator>> {
  return virtualSubject.internal_descriptor.type === "IsEnsuredIn";
}
