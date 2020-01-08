import { Reference } from "tripledoc";
import { VirtualSubject } from "./subject";
import {
  ContainerDescriptor,
  ByRef,
  IsFoundOn,
  IsContainedIn
} from "../descriptors/container";

export function describeContainer() {
  return {
    byRef: byRef,
    isFoundOn: isFoundOn,
    isContainedIn: isContainedIn
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
  return {
    internal_descriptor: {
      type: "ByRef",
      reference: reference
    }
  };
}

export function isFoundOn(
  subject: VirtualSubject,
  predicate: Reference
): VirtualContainer<IsFoundOn> {
  return {
    internal_descriptor: {
      type: "IsFoundOn",
      subject: subject,
      predicate: predicate
    }
  };
}

export function isContainedIn(
  container: VirtualContainer,
  name: string
): VirtualContainer<IsContainedIn> {
  return {
    internal_descriptor: {
      type: "IsContainedIn",
      container: container,
      name: name
    }
  };
}
