import { Reference, TripleDocument } from 'tripledoc';
import { VirtualSubject } from './subject';
import { DocumentDescriptor, ByRef, IsAclFor, IsFoundOn, IsEnsuredOn } from '../descriptors/document';

export function describeDocument() {
  return {
    byRef: (reference: Reference) => byRef(reference),
    isAclFor: (document: VirtualDocument) => isAclFor(document),
    isFoundOn: (subject: VirtualSubject, predicate: Reference) => isFoundOn(subject, predicate),
    isEnsuredOn: (subject: VirtualSubject, predicate: Reference, fallbackReference: Reference) => isEnsuredOn(subject, predicate, fallbackReference),
  };
}

export interface VirtualDocument<Descriptor extends DocumentDescriptor = DocumentDescriptor> {
  promise?: Promise<TripleDocument | null>;
  /**
   * @ignore
   */
  internal_descriptor: Descriptor;
};

export function byRef(reference: Reference): VirtualDocument<ByRef> {
  return generateVirtualDocument({
    type: 'ByRef',
    reference: reference,
  });
}

export function isAclFor(document: VirtualDocument): VirtualDocument<IsAclFor> {
  return generateVirtualDocument({
    type: 'IsAclFor',
    document: document,
  });
}

export function isFoundOn(subject: VirtualSubject, predicate: Reference): VirtualDocument<IsFoundOn> {
  return generateVirtualDocument({
    type: 'IsFoundOn',
    subject: subject,
    predicate: predicate,
  });
}

export function isEnsuredOn(
  subject: VirtualSubject,
  predicate: Reference,
  fallbackReference: Reference,
): VirtualDocument<IsEnsuredOn> {
  return generateVirtualDocument({
    type: 'IsEnsuredOn',
    subject: subject,
    predicate: predicate,
    fallbackReference: fallbackReference,
  });
}

function generateVirtualDocument<Descriptor extends DocumentDescriptor>(locater: Descriptor): VirtualDocument<Descriptor> {
  return {
    internal_descriptor: (locater),
  };
}

