import { Reference, TripleSubject } from 'tripledoc';
import { VirtualDocument } from './document';
import { SubjectDescriptor, ByRef, IsFoundIn, IsEnsuredIn } from '../descriptors/subject';

export function describeSubject() {
  return {
    byRef: (reference: Reference) => byRef(reference),
    isFoundIn: (document: VirtualDocument) => isFoundIn(document),
    isEnsuredIn: (document: VirtualDocument) => isEnsuredIn(document),
  };
}

export interface VirtualSubject<Descriptor extends SubjectDescriptor = SubjectDescriptor> {
  promise?: Promise<TripleSubject | null>;
  /**
   * @ignore
   */
  internal_descriptor: Descriptor;
};

function byRef(reference: Reference): VirtualSubject<ByRef> {
  const descriptor: ByRef = {
    reference: reference,
    type: 'ByRef',
  };
  return generateVirtualSubject(descriptor);
}

interface WithReferences<Descriptor extends IsFoundIn | IsEnsuredIn> extends VirtualSubject<Descriptor> {
  withRef: (predicate: Reference, object: Reference) => WithReferences<Descriptor>,
};

function generateRefAdder<Descriptor extends IsFoundIn | IsEnsuredIn>(
  virtualSubject: VirtualSubject<Descriptor>,
): (predicate: Reference, object: Reference) => WithReferences<Descriptor> {
  return (predicate: Reference, object: Reference) => {
    const newReferences = virtualSubject.internal_descriptor.references
      .concat({ predicate: predicate, object: object });
    const newDescriptor = {
      ...virtualSubject.internal_descriptor,
      references: newReferences,
    }
    const newSubject = generateVirtualSubject(newDescriptor);

    return {
      ...newSubject,
      withRef: generateRefAdder(newSubject),
    };
  };
}
function isFoundIn(document: VirtualDocument): WithReferences<IsFoundIn> {
  const descriptor: IsFoundIn = {
    type: 'IsFoundIn',
    document: document,
    references: [],
  };
  const rawSubject = generateVirtualSubject(descriptor);
  return {
    ...rawSubject,
    withRef: generateRefAdder(rawSubject),
  };
}
function isEnsuredIn(document: VirtualDocument): WithReferences<IsEnsuredIn> {
  const descriptor: IsEnsuredIn = {
    type: 'IsEnsuredIn',
    document: document,
    references: [],
  };
  const rawSubject = generateVirtualSubject(descriptor);
  return {
    ...rawSubject,
    withRef: generateRefAdder(rawSubject),
  };
}

function generateVirtualSubject<Descriptor extends SubjectDescriptor>(descriptor: Descriptor): VirtualSubject<Descriptor> {
  return {
    internal_descriptor: descriptor,
  };
}
