import { Reference, TripleSubject } from "tripledoc";
import { VirtualDocument } from "./document";
import {
  SubjectListDescriptor,
  IsFoundIn,
  IsFoundOn
} from "../descriptors/subjectList";
import { VirtualSubject } from "./subject";

export function describeSubjectList() {
  return {
    isFoundIn: isFoundIn,
    isFoundOn: isFoundOn
  };
}

export interface VirtualSubjectList<
  Descriptor extends SubjectListDescriptor = SubjectListDescriptor
> {
  promise?: Promise<TripleSubject[] | null>;
  /**
   * @ignore
   */
  internal_descriptor: Descriptor;
}

interface WithReferences<Descriptor extends IsFoundIn>
  extends VirtualSubjectList<Descriptor> {
  withRef: (
    predicate: Reference,
    object: Reference
  ) => WithReferences<Descriptor>;
}

function generateRefAdder(
  descriptor: IsFoundIn
): (predicate: Reference, object: Reference) => WithReferences<IsFoundIn> {
  return (predicate: Reference, object: Reference) => {
    const newReferences = descriptor.references.concat({
      predicate: predicate,
      object: object
    });
    const newDescriptor = {
      ...descriptor,
      references: newReferences
    };

    return {
      internal_descriptor: newDescriptor,
      withRef: generateRefAdder(newDescriptor)
    };
  };
}
function isFoundIn(document: VirtualDocument): WithReferences<IsFoundIn> {
  const descriptor: IsFoundIn = {
    type: "IsFoundIn",
    document: document,
    references: []
  };
  return {
    internal_descriptor: descriptor,
    withRef: generateRefAdder(descriptor)
  };
}

function isFoundOn(
  subject: VirtualSubject,
  predicate: Reference
): VirtualSubjectList<IsFoundOn> {
  const descriptor: IsFoundOn = {
    type: "IsFoundOn",
    subject: subject,
    predicate: predicate
  };
  return {
    internal_descriptor: descriptor
  };
}
