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

export function describeDocument() {
  return {
    isFoundAt: isFoundAt,
    isAclFor: isAclFor,
    isFoundOn: isFoundOn,
    isEnsuredOn: isEnsuredOn
  };
}

export interface VirtualDocument<
  Descriptor extends DocumentDescriptor = DocumentDescriptor
> {
  promise?: Promise<TripleDocument | null>;
  /**
   * @ignore
   */
  internal_descriptor: Descriptor;
}

export function isFoundAt(reference: Reference): VirtualDocument<IsFoundAt> {
  return {
    internal_descriptor: {
      type: "IsFoundAt",
      reference: reference
    }
  };
}

export function isAclFor(document: VirtualDocument): VirtualDocument<IsAclFor> {
  return {
    internal_descriptor: {
      type: "IsAclFor",
      document: document
    }
  };
}

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
  isReadableByEveryone: () => EnsuredVirtualDocument;
  isAppendableByEveryone: () => EnsuredVirtualDocument;
  isWritableByEveryone: () => EnsuredVirtualDocument;
  isControllableByEveryone: () => EnsuredVirtualDocument;
  isReadableByAgent: (agent: Reference) => EnsuredVirtualDocument;
  isAppendableByAgent: (agent: Reference) => EnsuredVirtualDocument;
  isWritableByAgent: (agent: Reference) => EnsuredVirtualDocument;
  isControllableByAgent: (agent: Reference) => EnsuredVirtualDocument;
  isReadableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => EnsuredVirtualDocument;
  isAppendableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => EnsuredVirtualDocument;
  isWritableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => EnsuredVirtualDocument;
  isControllableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => EnsuredVirtualDocument;
}
function generateEnsuredVirtualDocument(
  descriptor: IsEnsuredOn
): EnsuredVirtualDocument {
  return {
    internal_descriptor: descriptor,
    isReadableByEveryone: generateSetPublicAcl(descriptor, "read"),
    isAppendableByEveryone: generateSetPublicAcl(descriptor, "append"),
    isWritableByEveryone: generateSetPublicAcl(descriptor, "write"),
    isControllableByEveryone: generateSetPublicAcl(descriptor, "control"),
    isReadableByAgent: generateSetAgentAcl(descriptor, "read"),
    isAppendableByAgent: generateSetAgentAcl(descriptor, "append"),
    isWritableByAgent: generateSetAgentAcl(descriptor, "write"),
    isControllableByAgent: generateSetAgentAcl(descriptor, "control"),
    isReadableByOrigin: generateSetOriginAcl(descriptor, "read"),
    isAppendableByOrigin: generateSetOriginAcl(descriptor, "append"),
    isWritableByOrigin: generateSetOriginAcl(descriptor, "write"),
    isControllableByOrigin: generateSetOriginAcl(descriptor, "control")
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
