import {
  Reference,
  createDocument,
  fetchDocument as fetchTripleDocument
} from "tripledoc";
import SolidAuth from "solid-auth-client";
import { VirtualContainer } from "../virtual/container";
import {
  internal_isIsFoundAt,
  internal_isIsFoundOn,
  ContainerDescriptor,
  IsFoundAt,
  IsFoundOn,
  IsContainedIn,
  internal_isIsContainedIn
} from "../descriptors/container";
import { internal_fetchSubject } from "./subject";
import { hasAclSettings, configureAcl } from "../services/acl";

/**
 * Fetch the given Container.
 *
 * Performs the HTTP requests needed to fetch the Container described by `virtualContainer`.
 *
 * @ignore Experimental API.
 * @param virtualContainer [[VirtualContainer]] that is to be fetched.
 */
export async function internal_fetchContainer(
  virtualContainer: VirtualContainer
  // TODO: Add a TripleContainer to Tripledoc and return it here:
): Promise<Reference | null> {
  if (typeof virtualContainer.promise !== "undefined") {
    return virtualContainer.promise;
  }

  const promise = internal_isIsFoundAt(virtualContainer)
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

/**
 * @ignore Internal data structure.
 */
type ContainerFetcher<Descriptor extends ContainerDescriptor> = (
  virtualContainer: VirtualContainer<Descriptor>
) => Promise<Reference | null>;

const fetchByRef: ContainerFetcher<IsFoundAt> = async virtualContainer => {
  return virtualContainer.internal_descriptor.reference;
};

const getForRef: ContainerFetcher<IsFoundOn> = async virtualContainer => {
  const subject = await internal_fetchSubject(
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

/**
 * @ignore Internal API.
 */
const ensureInContainer: ContainerFetcher<IsContainedIn> = async virtualContainer => {
  const parentContainer = await internal_fetchContainer(
    virtualContainer.internal_descriptor.container
  );
  if (parentContainer === null) {
    return null;
  }

  const containerRef =
    // Remove trailing slashes from the parent Container:
    parentContainer.replace(/\/$/, "") +
    "/" +
    // Remove leading and trailing slashes from the name:
    virtualContainer.internal_descriptor.name
      .replace(/^\//, "")
      .replace(/\/$/, "") +
    "/";

  // If the requested Container already exists, return it:
  try {
    await fetchTripleDocument(containerRef);
    // No error thrown, so the Container exists:
    return containerRef;
  } catch (e) {
    // Swallow the error; we're going to create the Container instead.
  }

  const dummyFileRef = containerRef + ".dummy";

  await createDocument(dummyFileRef).save();
  // TODO Consider adding deletion to Tripledoc?
  await SolidAuth.fetch(dummyFileRef, { method: "DELETE" });

  const containerDocument = await fetchTripleDocument(containerRef);

  if (hasAclSettings(virtualContainer.internal_descriptor.acl)) {
    const aclRef = containerDocument.getAclRef();
    if (aclRef === null) {
      throw new Error(
        "Could not find a location for the Access Control List of this Container."
      );
    }
    await configureAcl(
      containerRef,
      aclRef,
      virtualContainer.internal_descriptor.acl,
      { default: true }
    );
  }

  return containerRef;
};
