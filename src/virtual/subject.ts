import { Reference, TripleSubject } from 'tripledoc';
import { VirtualDocument } from './document';

export interface VirtualSubject<Selecter extends SubjectSelecter = SubjectSelecter> {
  promise?: Promise<TripleSubject | null>;
  /**
   * @ignore
   */
  internalRepresentation: () => Selecter;
};

export type SubjectSelecter = FromRef | GetWithRefs | EnsureWithRefs;

export interface FromRef {
  type: 'FromRef';
  reference: Reference;
};
export function internal_isFromRef(virtualSubject: VirtualSubject): virtualSubject is VirtualSubject<FromRef> {
  return virtualSubject.internalRepresentation().type === 'FromRef';
}
export function selectSubjectFromRef(reference: Reference): VirtualSubject<FromRef> {
  const fromRef: FromRef = {
    reference: reference,
    type: 'FromRef',
  };
  return generateVirtualSubject(fromRef);
}

export interface GetWithRefs {
  type: 'GetWithRefs';
  document: VirtualDocument;
  references: Array<{ predicate: Reference, object: Reference }>;
};
export function internal_isGetWithRefs(virtualSubject: VirtualSubject): virtualSubject is VirtualSubject<GetWithRefs> {
  return virtualSubject.internalRepresentation().type === 'GetWithRefs';
}
export function GetWithRef(document: VirtualDocument, predicate: Reference, object: Reference): VirtualSubject<GetWithRefs> {
  const getWithRefs: GetWithRefs = {
    document: document,
    type: 'GetWithRefs',
    references: [{ predicate: predicate, object: object }],
  };
  return generateVirtualSubject(getWithRefs);
}

export interface EnsureWithRefs {
  type: 'EnsureWithRefs';
  document: VirtualDocument;
  references: Array<{ predicate: Reference, object: Reference }>;
};
export function internal_isEnsureWithRefs(virtualSubject: VirtualSubject): virtualSubject is VirtualSubject<EnsureWithRefs> {
  return virtualSubject.internalRepresentation().type === 'EnsureWithRefs';
}
interface VirtualSubjectWithRefRequirements extends VirtualSubject<EnsureWithRefs> {
  andWithRef: (predicate: Reference, object: Reference) => VirtualSubjectWithRefRequirements,
}
export function ensureSubjectWithRef(
  document: VirtualDocument,
  predicate: Reference,
  object: Reference,
): VirtualSubjectWithRefRequirements {
  const ensureWithRefs: EnsureWithRefs = {
    document: document,
    type: 'EnsureWithRefs',
    references: [{ predicate: predicate, object: object }],
  };
  const virtualSubject = generateVirtualSubject(ensureWithRefs);
  const virtualSubjectWithRefRequirements: VirtualSubjectWithRefRequirements = {
    ...virtualSubject,
    andWithRef: (predicate, object) => ensureSubjectWithMultipleRefs(virtualSubject, predicate, object),
  };

  return virtualSubjectWithRefRequirements;
}
function ensureSubjectWithMultipleRefs(
  subject: VirtualSubject<EnsureWithRefs>,
  predicate: Reference,
  object: Reference,
): VirtualSubjectWithRefRequirements {
  const newRefs = [...subject.internalRepresentation().references];
  newRefs.push({ predicate: predicate, object: object });

  const virtualSubject = generateVirtualSubject({
    ...subject.internalRepresentation(),
    references: newRefs,
  });
  const virtualSubjectWithRefRequirements: VirtualSubjectWithRefRequirements = {
    ...virtualSubject,
    andWithRef: (predicate, object) => ensureSubjectWithMultipleRefs(virtualSubject, predicate, object),
  };

  return virtualSubjectWithRefRequirements;
}

function generateVirtualSubject<Selecter extends SubjectSelecter>(selecter: Selecter): VirtualSubject<Selecter> {
  return {
    internalRepresentation: () => (selecter),
  };
}

