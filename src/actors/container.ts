import { Reference } from "tripledoc";
import { VirtualContainer } from "../virtual/container";
import {
  internal_isByRef,
  internal_isIsFoundOn,
  ContainerDescriptor,
  ByRef,
  IsFoundOn
} from "../descriptors/container";
import { fetchSubject } from "./subject";

export async function fetchContainer(
  virtualContainer: VirtualContainer
  // TODO: Add a TripleContainer to Tripledoc and return it here:
): Promise<Reference | null> {
  if (typeof virtualContainer.promise !== "undefined") {
    return virtualContainer.promise;
  }

  const promise = internal_isByRef(virtualContainer)
    ? fetchByRef(virtualContainer)
    : internal_isIsFoundOn(virtualContainer)
    ? getForRef(virtualContainer)
    : Promise.reject(
        new Error("This type of Virtual Document can not be processed yet.")
      );

  virtualContainer.promise = promise;

  return promise;
}

type ContainerFetcher<Descriptor extends ContainerDescriptor> = (
  virtualContainer: VirtualContainer<Descriptor>
) => Promise<Reference | null>;

const fetchByRef: ContainerFetcher<ByRef> = async virtualContainer => {
  return virtualContainer.internal_descriptor.reference;
};

const getForRef: ContainerFetcher<IsFoundOn> = async virtualContainer => {
  const subject = await fetchSubject(
    virtualContainer.internal_descriptor.subject
  );
  if (subject === null) {
    return null;
  }

  const reference = subject.getRef(
    virtualContainer.internal_descriptor.predicate
  );
  return reference;
};
