import { Reference } from "tripledoc";
import { VirtualSubject } from "../virtual/subject";
import { VirtualDocument } from "../virtual/document";

export type SubjectDescriptor = ByRef | IsFoundIn | IsEnsuredIn;

export interface ByRef {
  type: "ByRef";
  reference: Reference;
}
export function internal_isByRef(
  virtualSubject: VirtualSubject
): virtualSubject is VirtualSubject<ByRef> {
  return virtualSubject.internal_descriptor.type === "ByRef";
}

export interface IsFoundIn {
  type: "IsFoundIn";
  document: VirtualDocument;
  references: Array<{ predicate: Reference; object: Reference }>;
}
export function internal_isIsFoundIn(
  virtualSubject: VirtualSubject
): virtualSubject is VirtualSubject<IsFoundIn> {
  return virtualSubject.internal_descriptor.type === "IsFoundIn";
}

export interface IsEnsuredIn {
  type: "IsEnsuredIn";
  document: VirtualDocument;
  references: Array<{ predicate: Reference; object: Reference }>;
}
export function internal_isIsEnsuredIn(
  virtualSubject: VirtualSubject
): virtualSubject is VirtualSubject<IsEnsuredIn> {
  return virtualSubject.internal_descriptor.type === "IsEnsuredIn";
}
