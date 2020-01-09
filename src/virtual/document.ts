import { Reference, TripleDocument } from "tripledoc";
import { VirtualSubject } from "./subject";
import { VirtualContainer } from "./container";
import {
  DocumentDescriptor,
  ByRef,
  IsAclFor,
  IsFoundOn,
  IsEnsuredOn,
  AclSettings
} from "../descriptors/document";

export function describeDocument() {
  return {
    byRef: (reference: Reference) => byRef(reference),
    isAclFor: (document: VirtualDocument) => isAclFor(document),
    isFoundOn: (subject: VirtualSubject, predicate: Reference) =>
      isFoundOn(subject, predicate),
    isEnsuredOn: (
      subject: VirtualSubject,
      predicate: Reference,
      fallbackContainer: VirtualContainer
    ) => isEnsuredOn(subject, predicate, fallbackContainer)
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

export function byRef(reference: Reference): VirtualDocument<ByRef> {
  return {
    internal_descriptor: {
      type: "ByRef",
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
): VirtualDocument<IsEnsuredOn> {
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
    isControllableByAgent: generateSetAgentAcl(descriptor, "control")
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
