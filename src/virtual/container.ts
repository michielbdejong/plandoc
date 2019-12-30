import { Reference } from "tripledoc";
import { VirtualSubject } from "./subject";
import {
  ContainerDescriptor,
  ByRef,
  IsFoundOn
} from "../descriptors/container";

export function describeContainer() {
  return {
    byRef: (reference: Reference) => byRef(reference),
    isFoundOn: (subject: VirtualSubject, predicate: Reference) =>
      isFoundOn(subject, predicate)
  };
}

export interface VirtualContainer<
  Descriptor extends ContainerDescriptor = ContainerDescriptor
> {
  // TODO: Add a TripleContainer to Tripledoc and use it here:
  promise?: Promise<Reference | null>;
  /**
   * @ignore
   */
  internal_descriptor: Descriptor;
}

export function byRef(reference: Reference): VirtualContainer<ByRef> {
  return generateVirtualContainer({
    type: "ByRef",
    reference: reference
  });
}

export function isFoundOn(
  subject: VirtualSubject,
  predicate: Reference
): VirtualContainer<IsFoundOn> {
  return generateVirtualContainer({
    type: "IsFoundOn",
    subject: subject,
    predicate: predicate
  });
}

function generateVirtualContainer<Descriptor extends ContainerDescriptor>(
  descriptor: Descriptor
): VirtualContainer<Descriptor> {
  return {
    internal_descriptor: descriptor
  };
}
