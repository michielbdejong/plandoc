import { Reference, createDocument } from "tripledoc";
import SolidAuth from "solid-auth-client";
import { VirtualContainer } from "../virtual/container";
import {
  internal_isByRef,
  internal_isIsFoundOn,
  ContainerDescriptor,
  ByRef,
  IsFoundOn,
  IsContainedIn,
  internal_isIsContainedIn
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
    : internal_isIsContainedIn(virtualContainer)
    ? ensureInContainer(virtualContainer)
    : Promise.reject(
        new Error("This type of Virtual Container can not be processed yet.")
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

const ensureInContainer: ContainerFetcher<IsContainedIn> = async virtualContainer => {
  const parentContainer = await fetchContainer(
    virtualContainer.internal_descriptor.container
  );
  if (parentContainer === null) {
    return null;
  }

  const containerRef =
    parentContainer.replace(/\/$/, "") + '/' +
    virtualContainer.internal_descriptor.name.replace(/\/$/, "");
  const dummyFileRef = containerRef + "/.dummy";

  await createDocument(dummyFileRef).save();
  // TODO Consider adding deletion to Tripledoc?
  await SolidAuth.fetch(dummyFileRef, { method: "DELETE" });

  return containerRef;
};
