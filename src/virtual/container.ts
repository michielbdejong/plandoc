import { Reference } from "tripledoc";
import { VirtualSubject } from "./subject";
import {
  ContainerDescriptor,
  IsFoundAt,
  IsFoundOn,
  IsContainedIn
} from "../descriptors/container";
import { AclSettings } from "../services/acl";

export function describeContainer() {
  return {
    isFoundAt: isFoundAt,
    isFoundOn: isFoundOn,
    experimental_isContainedIn: isContainedIn
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

export function isFoundAt(reference: Reference): VirtualContainer<IsFoundAt> {
  return {
    internal_descriptor: {
      type: "IsFoundAt",
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
  experimental_isReadableByEveryone: () => ContainedVirtualContainer;
  experimental_isAppendableByEveryone: () => ContainedVirtualContainer;
  experimental_isWritableByEveryone: () => ContainedVirtualContainer;
  experimental_isControllableByEveryone: () => ContainedVirtualContainer;
  experimental_isReadableByAgent: (
    agent: Reference
  ) => ContainedVirtualContainer;
  experimental_isAppendableByAgent: (
    agent: Reference
  ) => ContainedVirtualContainer;
  experimental_isWritableByAgent: (
    agent: Reference
  ) => ContainedVirtualContainer;
  experimental_isControllableByAgent: (
    agent: Reference
  ) => ContainedVirtualContainer;
  experimental_isReadableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => ContainedVirtualContainer;
  experimental_isAppendableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => ContainedVirtualContainer;
  experimental_isWritableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => ContainedVirtualContainer;
  experimental_isControllableByOrigin: (
    origin: Reference,
    agent: Reference
  ) => ContainedVirtualContainer;
}
function generateContainedVirtualContainer(
  descriptor: IsContainedIn
): ContainedVirtualContainer {
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
