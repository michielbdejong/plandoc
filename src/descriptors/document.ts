import { Reference } from "tripledoc";
import { VirtualDocument } from "../virtual/document";
import { VirtualSubject } from "../virtual/subject";
import { VirtualContainer } from "../virtual/container";

export type DocumentDescriptor = ByRef | IsAclFor | IsFoundOn | IsEnsuredOn;

export interface ByRef {
  type: "ByRef";
  reference: Reference;
}
/**
 * @ignore
 */
export function internal_isByRef(
  virtualDocument: VirtualDocument
): virtualDocument is VirtualDocument<ByRef> {
  return virtualDocument.internal_descriptor.type === "ByRef";
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
export interface AclSettings {
  public?: {
    read?: boolean;
    append?: boolean;
    write?: boolean;
    control?: boolean;
  };
  origins?: Array<{
    origin: Reference;
    read?: boolean;
    append?: boolean;
    write?: boolean;
    control?: boolean;
  }>;
  agents?: Array<{
    origin: Reference;
    read?: boolean;
    append?: boolean;
    write?: boolean;
    control?: boolean;
  }>;
}
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
