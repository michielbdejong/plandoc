import { Reference } from "tripledoc";
import { VirtualSubject } from "./subject";
import {
  ContainerDescriptor,
  ByRef,
  IsFoundOn,
  IsContainedIn
} from "../descriptors/container";
import { AclSettings } from "../services/acl";

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
): ContainedVirtualContainer {
  return generateContainedVirtualContainer({
    type: "IsContainedIn",
    container: container,
    name: name,
    acl: {}
  });
}

interface ContainedVirtualContainer extends VirtualContainer<IsContainedIn> {
  isReadableByEveryone: () => ContainedVirtualContainer;
  isAppendableByEveryone: () => ContainedVirtualContainer;
  isWritableByEveryone: () => ContainedVirtualContainer;
  isControllableByEveryone: () => ContainedVirtualContainer;
  isReadableByAgent: (agent: Reference) => ContainedVirtualContainer;
  isAppendableByAgent: (agent: Reference) => ContainedVirtualContainer;
  isWritableByAgent: (agent: Reference) => ContainedVirtualContainer;
  isControllableByAgent: (agent: Reference) => ContainedVirtualContainer;
  isReadableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => ContainedVirtualContainer;
  isAppendableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => ContainedVirtualContainer;
  isWritableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => ContainedVirtualContainer;
  isControllableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => ContainedVirtualContainer;
}
function generateContainedVirtualContainer(
  descriptor: IsContainedIn
): ContainedVirtualContainer {
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
  descriptor: IsContainedIn,
  accessMode: "read" | "append" | "write" | "control"
): (origin: Reference, agent: Reference) => ContainedVirtualContainer {
  return (origin: Reference, agent: Reference) => {
    const acl: AclSettings = descriptor.acl ?? {};
    acl.origins = acl.origins ?? {};
    acl.origins[origin] = acl.origins[origin] ?? {};
    acl.origins[origin][agent] = acl.origins[origin][agent] ?? {};
    acl.origins[origin][agent][accessMode] = true;
    const newDescriptor: IsContainedIn = {
      ...descriptor,
      acl: acl
    };

    return generateContainedVirtualContainer(newDescriptor);
  };
}

function generateSetAgentAcl(
  descriptor: IsContainedIn,
  accessMode: "read" | "append" | "write" | "control"
): (agent: Reference) => ContainedVirtualContainer {
  return (agent: Reference) => {
    const acl: AclSettings = descriptor.acl ?? {};
    acl.agents = acl.agents ?? {};
    acl.agents[agent] = acl.agents[agent] ?? {};
    acl.agents[agent][accessMode] = true;
    const newDescriptor: IsContainedIn = {
      ...descriptor,
      acl: acl
    };

    return generateContainedVirtualContainer(newDescriptor);
  };
}

function generateSetPublicAcl(
  descriptor: IsContainedIn,
  accessMode: "read" | "append" | "write" | "control"
): () => ContainedVirtualContainer {
  return () => {
    const acl: AclSettings = descriptor.acl ?? {};
    acl.public = acl.public ?? {};
    acl.public[accessMode] = true;
    const newDescriptor: IsContainedIn = {
      ...descriptor,
      acl: acl
    };

    return generateContainedVirtualContainer(newDescriptor);
  };
}
