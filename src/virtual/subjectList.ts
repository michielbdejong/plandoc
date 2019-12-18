import { Reference, TripleSubject } from "tripledoc";
import { VirtualDocument } from "./document";
import { SubjectListDescriptor, IsFoundIn } from "../descriptors/subjectList";

export function describeSubjectList() {
  return {
    isFoundIn: (document: VirtualDocument) => isFoundIn(document)
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

function generateRefAdder<Descriptor extends IsFoundIn>(
  virtualSubjectList: VirtualSubjectList<Descriptor>
): (predicate: Reference, object: Reference) => WithReferences<Descriptor> {
  return (predicate: Reference, object: Reference) => {
    const newReferences = virtualSubjectList.internal_descriptor.references.concat(
      {
        predicate: predicate,
        object: object
      }
    );
    const newDescriptor = {
      ...virtualSubjectList.internal_descriptor,
      references: newReferences
    };
    const newSubjectList = generateVirtualSubjectList(newDescriptor);

    return {
      ...newSubjectList,
      withRef: generateRefAdder(newSubjectList)
    };
  };
}
function isFoundIn(document: VirtualDocument): WithReferences<IsFoundIn> {
  const descriptor: IsFoundIn = {
    type: "IsFoundIn",
    document: document,
    references: []
  };
  const rawSubjectList = generateVirtualSubjectList(descriptor);
  return {
    ...rawSubjectList,
    withRef: generateRefAdder(rawSubjectList)
  };
}

function generateVirtualSubjectList<Descriptor extends SubjectListDescriptor>(
  descriptor: Descriptor
): VirtualSubjectList<Descriptor> {
  return {
    internal_descriptor: descriptor
  };
}
