import { Reference } from "tripledoc";
import { experimental_VirtualSubjectList } from "../virtual/subjectList";
import { VirtualDocument } from "../virtual/document";
import { VirtualSubject } from "../virtual/subject";

export type SubjectListDescriptor = IsFoundIn | IsFoundOn;

export interface IsFoundIn {
  type: "IsFoundIn";
  document: VirtualDocument;
  references: Array<{ predicate: Reference; object: Reference }>;
}
export function internal_isIsFoundIn(
  virtualSubjectList: experimental_VirtualSubjectList
): virtualSubjectList is experimental_VirtualSubjectList<IsFoundIn> {
  return virtualSubjectList.internal_descriptor.type === "IsFoundIn";
}

export interface IsFoundOn {
  type: "IsFoundOn";
  subject: VirtualSubject;
  predicate: Reference;
}
export function internal_isIsFoundOn(
  virtualSubjectList: experimental_VirtualSubjectList
): virtualSubjectList is experimental_VirtualSubjectList<IsFoundOn> {
  return virtualSubjectList.internal_descriptor.type === "IsFoundOn";
}
