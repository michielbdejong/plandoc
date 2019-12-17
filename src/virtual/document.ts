import { Reference, TripleDocument } from 'tripledoc';
import { VirtualSubject } from './subject';

export interface VirtualDocument<Locater extends DocumentLocater = DocumentLocater> {
  promise?: Promise<TripleDocument | null>;
  /**
   * @ignore
   */
  internalRepresentation: () => Locater;
};

export type DocumentLocater = GetByRef | GetFromAcl | GetForRef | EnsureForRef;

export interface GetByRef {
  type: 'GetByRef',
  reference: Reference,
};
/**
 * @ignore
 */
export function internal_isGetByRef(virtualDocument: VirtualDocument): virtualDocument is VirtualDocument<GetByRef> {
  return virtualDocument.internalRepresentation().type === 'GetByRef';
}
export function locateDocByRef(reference: Reference): VirtualDocument<GetByRef> {
  return generateVirtualDocument({
    type: 'GetByRef',
    reference: reference,
  });
}

export interface GetFromAcl {
  type: 'GetFromAcl',
  document: VirtualDocument,
};
/**
 * @ignore
 */
export function internal_isGetFromAcl(virtualDocument: VirtualDocument): virtualDocument is VirtualDocument<GetFromAcl> {
  return virtualDocument.internalRepresentation().type === 'GetFromAcl';
}
export function getDocFromAcl(document: VirtualDocument): VirtualDocument<GetFromAcl> {
  return generateVirtualDocument({
    type: 'GetFromAcl',
    document:document,
  });
}

export interface GetForRef {
  type: 'GetForRef',
  subject: VirtualSubject,
  predicate: Reference,
};
/**
 * @ignore
 */
export function internal_isGetForRef(virtualDocument: VirtualDocument): virtualDocument is VirtualDocument<GetForRef> {
  return virtualDocument.internalRepresentation().type === 'GetForRef';
}
export function getDocForRef(subject: VirtualSubject, predicate: Reference): VirtualDocument<GetForRef> {
  return generateVirtualDocument({
    type: 'GetForRef',
    subject: subject,
    predicate: predicate,
  });
}

export interface EnsureForRef {
  type: 'EnsureForRef',
  subject: VirtualSubject,
  predicate: Reference,
  fallbackReference: Reference,
};
/**
 * @ignore
 */
export function internal_isEnsureForRef(virtualDocument: VirtualDocument): virtualDocument is VirtualDocument<EnsureForRef> {
  return virtualDocument.internalRepresentation().type === 'EnsureForRef';
}
export function ensureDocForRef(subject: VirtualSubject, predicate: Reference, fallbackReference: Reference): VirtualDocument<EnsureForRef> {
  return generateVirtualDocument({
    type: 'EnsureForRef',
    subject: subject,
    predicate: predicate,
    fallbackReference: fallbackReference,
  });
}

function generateVirtualDocument<Locater extends DocumentLocater>(locater: Locater): VirtualDocument<Locater> {
  return {
    internalRepresentation: () => (locater),
  };
}

