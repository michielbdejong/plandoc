import { Reference } from "tripledoc";
import { VirtualSubjectList } from "../virtual/subjectList";
import { VirtualDocument } from "../virtual/document";

export type SubjectListDescriptor = IsFoundIn;

export interface IsFoundIn {
  type: "IsFoundIn";
  document: VirtualDocument;
  references: Array<{ predicate: Reference; object: Reference }>;
}
export function internal_isIsFoundIn(
  virtualSubjectList: VirtualSubjectList
): virtualSubjectList is VirtualSubjectList<IsFoundIn> {
  return virtualSubjectList.internal_descriptor.type === "IsFoundIn";
}
