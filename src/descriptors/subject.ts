import { Reference } from "tripledoc";
import { VirtualSubject } from "../virtual/subject";
import { VirtualDocument } from "../virtual/document";

export type SubjectDescriptor =
  | IsFoundAt
  | IsFoundOn
  | IsEnsuredOn
  | IsFoundIn<SubjectLocator>
  | IsEnsuredIn<SubjectLocator>;

export interface IsFoundAt {
  type: "IsFoundAt";
  reference: Reference;
}
export function internal_isIsFoundAt(
  virtualSubject: VirtualSubject
): virtualSubject is VirtualSubject<IsFoundAt> {
  return virtualSubject.internal_descriptor.type === "IsFoundAt";
}

export interface IsFoundOn {
  type: "IsFoundOn";
  subject: VirtualSubject;
  predicate: Reference;
}
export function internal_isIsFoundOn(
  virtualSubject: VirtualSubject
): virtualSubject is VirtualSubject<IsFoundOn> {
  return virtualSubject.internal_descriptor.type === "IsFoundOn";
}

export interface IsEnsuredOn {
  type: "IsEnsuredOn";
  subject: VirtualSubject;
  predicate: Reference;
}
export function internal_isIsEnsuredOn(
  virtualSubject: VirtualSubject
): virtualSubject is VirtualSubject<IsEnsuredOn> {
  return virtualSubject.internal_descriptor.type === "IsEnsuredOn";
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
