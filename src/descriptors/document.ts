import { Reference } from "tripledoc";
import { VirtualDocument } from "../virtual/document";
import { VirtualSubject } from "../virtual/subject";
import { VirtualContainer } from "../virtual/container";
import { AclSettings } from "../services/acl";

export type DocumentDescriptor = IsFoundAt | IsAclFor | IsFoundOn | IsEnsuredOn;

export interface IsFoundAt {
  type: "IsFoundAt";
  reference: Reference;
}
/**
 * @ignore
 */
export function internal_isIsFoundAt(
  virtualDocument: VirtualDocument
): virtualDocument is VirtualDocument<IsFoundAt> {
  return virtualDocument.internal_descriptor.type === "IsFoundAt";
}

export interface IsAclFor {
  type: "IsAclFor";
  document: VirtualDocument;
}
/**
 * @ignore
 */
export function internal_isIsAclFor(
  virtualDocument: VirtualDocument
): virtualDocument is VirtualDocument<IsAclFor> {
  return virtualDocument.internal_descriptor.type === "IsAclFor";
}

export interface IsFoundOn {
  type: "IsFoundOn";
  subject: VirtualSubject;
  predicate: Reference;
}
/**
 * @ignore
 */
export function internal_isIsFoundOn(
  virtualDocument: VirtualDocument
): virtualDocument is VirtualDocument<IsFoundOn> {
  return virtualDocument.internal_descriptor.type === "IsFoundOn";
}

// TODO: Add option to suggest a file name
export interface IsEnsuredOn {
  type: "IsEnsuredOn";
  subject: VirtualSubject;
  predicate: Reference;
  fallbackContainer: VirtualContainer;
  acl: AclSettings;
}
/**
 * @ignore
 */
export function internal_isIsEnsuredOn(
  virtualDocument: VirtualDocument
): virtualDocument is VirtualDocument<IsEnsuredOn> {
  return virtualDocument.internal_descriptor.type === "IsEnsuredOn";
}
