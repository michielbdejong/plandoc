import { Reference, TripleDocument } from "tripledoc";
import { VirtualSubject } from "./subject";
import { VirtualContainer } from "./container";
import {
  DocumentDescriptor,
  IsFoundAt,
  IsAclFor,
  IsFoundOn,
  IsEnsuredOn
} from "../descriptors/document";
import { AclSettings } from "../services/acl";

/**
 * Construct a [[VirtualDocument]].
 *
 * This function allows you to programmatically construct a [[VirtualDocument]] by chaining
 * together a number of functions.
 */
export function describeDocument() {
  return {
    isFoundAt: isFoundAt,
    isFoundOn: isFoundOn,
    isEnsuredOn: isEnsuredOn,
    experimental_isAclFor: isAclFor
  };
}

/**
 * A representation of how to get to a given Document.
 */
export interface VirtualDocument<
  Descriptor extends DocumentDescriptor = DocumentDescriptor
> {
  promise?: Promise<TripleDocument | null>;
  /**
   * @ignore
   */
  internal_descriptor: Descriptor;
}

/**
 * Describe a Document for which you know the IRI.
 *
 * @param reference IRI of the desired Document.
 */
export function isFoundAt(reference: Reference): VirtualDocument<IsFoundAt> {
  return {
    internal_descriptor: {
      type: "IsFoundAt",
      reference: reference
    }
  };
}

/**
 * Describe a Document that acts as the ACL Document for a given other Document.
 *
 * @ignore Experimental API.
 * @param document [[VirtualDocument]] describing the Document this is the ACL Document for.
 */
export function isAclFor(document: VirtualDocument): VirtualDocument<IsAclFor> {
  return {
    internal_descriptor: {
      type: "IsAclFor",
      document: document
    }
  };
}

/**
 * Describe a Document that is referred to by a given Subject.
 *
 * @param subject [[VirtualSubject]] describing the Subject that points to this Document.
 * @param predicate Predicate that is used on `subject` to point to this Document.
 */
export function isFoundOn(
  subject: VirtualSubject,
  predicate: Reference
): VirtualDocument<IsFoundOn> {
  return {
    internal_descriptor: {
      type: "IsFoundOn",
      subject: subject,
      predicate: predicate
    }
  };
}

/**
 * Describe a Document that should be referred to by a given Subject.
 *
 * If the given Subject does not refer to a Document yet for the given Predicate, a new Document
 * will be created inside [[isEnsuredOn.fallbackContainer]] and added to the given Subject for the
 * given Predicate.
 *
 * @param subject [[VirtualSubject]] describing the Subject that points to this Document.
 * @param predicate Predicate that is used on `subject` to point to this Document.
 * @param fallbackContainer [[VirtualContainer]] describing the Container in which the Document
 *                          should be created if it does not exist yet.
 */
export function isEnsuredOn(
  subject: VirtualSubject,
  predicate: Reference,
  fallbackContainer: VirtualContainer
): EnsuredVirtualDocument {
  const descriptor: IsEnsuredOn = {
    type: "IsEnsuredOn",
    subject: subject,
    predicate: predicate,
    fallbackContainer: fallbackContainer,
    acl: {}
  };

  return generateEnsuredVirtualDocument(descriptor);
}

interface EnsuredVirtualDocument extends VirtualDocument<IsEnsuredOn> {
  experimental_isReadableByEveryone: () => EnsuredVirtualDocument;
  experimental_isAppendableByEveryone: () => EnsuredVirtualDocument;
  experimental_isWritableByEveryone: () => EnsuredVirtualDocument;
  experimental_isControllableByEveryone: () => EnsuredVirtualDocument;
  experimental_isReadableByAgent: (agent: Reference) => EnsuredVirtualDocument;
  experimental_isAppendableByAgent: (
    agent: Reference
  ) => EnsuredVirtualDocument;
  experimental_isWritableByAgent: (agent: Reference) => EnsuredVirtualDocument;
  experimental_isControllableByAgent: (
    agent: Reference
  ) => EnsuredVirtualDocument;
  experimental_isReadableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => EnsuredVirtualDocument;
  experimental_isAppendableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => EnsuredVirtualDocument;
  experimental_isWritableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => EnsuredVirtualDocument;
  experimental_isControllableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => EnsuredVirtualDocument;
}
function generateEnsuredVirtualDocument(
  descriptor: IsEnsuredOn
): EnsuredVirtualDocument {
  return {
    internal_descriptor: descriptor,
    experimental_isReadableByEveryone: generateSetPublicAcl(descriptor, "read"),
    experimental_isAppendableByEveryone: generateSetPublicAcl(
      descriptor,
      "append"
    ),
    experimental_isWritableByEveryone: generateSetPublicAcl(
      descriptor,
      "write"
    ),
    experimental_isControllableByEveryone: generateSetPublicAcl(
      descriptor,
      "control"
    ),
    experimental_isReadableByAgent: generateSetAgentAcl(descriptor, "read"),
    experimental_isAppendableByAgent: generateSetAgentAcl(descriptor, "append"),
    experimental_isWritableByAgent: generateSetAgentAcl(descriptor, "write"),
    experimental_isControllableByAgent: generateSetAgentAcl(
      descriptor,
      "control"
    ),
    experimental_isReadableByOrigin: generateSetOriginAcl(descriptor, "read"),
    experimental_isAppendableByOrigin: generateSetOriginAcl(
      descriptor,
      "append"
    ),
    experimental_isWritableByOrigin: generateSetOriginAcl(descriptor, "write"),
    experimental_isControllableByOrigin: generateSetOriginAcl(
      descriptor,
      "control"
    )
  };
}

function generateSetOriginAcl(
  descriptor: IsEnsuredOn,
  accessMode: "read" | "append" | "write" | "control"
): (origin: Reference, agent: Reference) => EnsuredVirtualDocument {
  return (origin: Reference, agent: Reference) => {
    const acl: AclSettings = descriptor.acl ?? {};
    acl.origins = acl.origins ?? {};
    acl.origins[origin] = acl.origins[origin] ?? {};
    acl.origins[origin][agent] = acl.origins[origin][agent] ?? {};
    acl.origins[origin][agent][accessMode] = true;
    const newDescriptor: IsEnsuredOn = {
      ...descriptor,
      acl: acl
    };

    return generateEnsuredVirtualDocument(newDescriptor);
  };
}

function generateSetAgentAcl(
  descriptor: IsEnsuredOn,
  accessMode: "read" | "append" | "write" | "control"
): (agent: Reference) => EnsuredVirtualDocument {
  return (agent: Reference) => {
    const acl: AclSettings = descriptor.acl ?? {};
    acl.agents = acl.agents ?? {};
    acl.agents[agent] = acl.agents[agent] ?? {};
    acl.agents[agent][accessMode] = true;
    const newDescriptor: IsEnsuredOn = {
      ...descriptor,
      acl: acl
    };

    return generateEnsuredVirtualDocument(newDescriptor);
  };
}

function generateSetPublicAcl(
  descriptor: IsEnsuredOn,
  accessMode: "read" | "append" | "write" | "control"
): () => EnsuredVirtualDocument {
  return () => {
    const acl: AclSettings = descriptor.acl ?? {};
    acl.public = acl.public ?? {};
    acl.public[accessMode] = true;
    const newDescriptor: IsEnsuredOn = {
      ...descriptor,
      acl: acl
    };

    return generateEnsuredVirtualDocument(newDescriptor);
  };
}
