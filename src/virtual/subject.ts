import { Reference, TripleSubject } from "tripledoc";
import { VirtualDocument } from "./document";
import {
  SubjectDescriptor,
  IsFoundAt,
  IsFoundIn,
  IsEnsuredIn,
  SubjectLocator,
  WithRefLocator,
  AsRefLocator,
  IsFoundOn,
  IsEnsuredOn
} from "../descriptors/subject";

export function describeSubject() {
  return {
    isFoundAt: isFoundAt,
    isFoundOn: isFoundOn,
    isEnsuredOn: isEnsuredOn,
    isFoundIn: isFoundIn,
    isEnsuredIn: isEnsuredIn
  };
}

export interface VirtualSubject<
  Descriptor extends SubjectDescriptor = SubjectDescriptor
> {
  promise?: Promise<TripleSubject | null>;
  /**
   * @ignore
   */
  internal_descriptor: Descriptor;
}

function isFoundAt(reference: Reference): VirtualSubject<IsFoundAt> {
  const descriptor: IsFoundAt = {
    reference: reference,
    type: "IsFoundAt"
  };
  return {
    internal_descriptor: descriptor
  };
}

function isFoundOn(
  subject: VirtualSubject,
  predicate: Reference
): VirtualSubject<IsFoundOn> {
  const descriptor: IsFoundOn = {
    predicate: predicate,
    subject: subject,
    type: "IsFoundOn"
  };
  return {
    internal_descriptor: descriptor
  };
}

function isEnsuredOn(
  subject: VirtualSubject,
  predicate: Reference
): VirtualSubject<IsEnsuredOn> {
  const descriptor: IsEnsuredOn = {
    predicate: predicate,
    subject: subject,
    type: "IsEnsuredOn"
  };
  return {
    internal_descriptor: descriptor
  };
}

function generateIsFoundIn_WithRef_VirtualSubject(
  descriptor:
    | IsFoundIn<WithRefLocator>
    | Omit<IsFoundIn<SubjectLocator>, "locator">
): (
  predicate: Reference,
  object: Reference
) => IsFoundIn_WithRef_VirtualSubject {
  return (predicate: Reference, object: Reference) => {
    const locator: WithRefLocator = (descriptor as IsFoundIn<WithRefLocator>)
      .locator ?? { references: [] };
    const newReferences = locator.references.concat({
      predicate: predicate,
      object: object
    });
    const newDescriptor: IsFoundIn<WithRefLocator> = {
      ...descriptor,
      locator: { references: newReferences }
    };

    const subjectWithRefAdder: IsFoundIn_WithRef_VirtualSubject = {
      internal_descriptor: newDescriptor,
      withRef: generateIsFoundIn_WithRef_VirtualSubject(newDescriptor)
    };

    return subjectWithRefAdder;
  };
}
function generateIsFoundIn_AsRef_VirtualSubject(
  bareDescriptor: Omit<IsFoundIn<SubjectLocator>, "locator">
): (reference: Reference) => IsFoundIn_AsRef_VirtualSubject {
  return (reference: Reference) => {
    const descriptor: IsFoundIn<AsRefLocator> = {
      ...bareDescriptor,
      locator: {
        reference: reference
      }
    };
    return {
      internal_descriptor: descriptor
    };
  };
}
interface IsFoundIn_WithRef_VirtualSubject
  extends VirtualSubject<IsFoundIn<WithRefLocator>> {
  withRef: (
    predicate: Reference,
    object: Reference
  ) => IsFoundIn_WithRef_VirtualSubject;
}
type IsFoundIn_AsRef_VirtualSubject = VirtualSubject<IsFoundIn<AsRefLocator>>;
interface IsFoundIn_Bare_VirtualSubject {
  internal_descriptor: Omit<IsFoundIn<SubjectLocator>, "locator">;
  withRef: (
    predicate: Reference,
    object: Reference
  ) => IsFoundIn_WithRef_VirtualSubject;
  asRef: (reference: Reference) => IsFoundIn_AsRef_VirtualSubject;
}
function isFoundIn(document: VirtualDocument): IsFoundIn_Bare_VirtualSubject {
  const bareDescriptor: Omit<IsFoundIn<SubjectLocator>, "locator"> = {
    type: "IsFoundIn",
    document: document
  };
  return {
    internal_descriptor: bareDescriptor,
    withRef: generateIsFoundIn_WithRef_VirtualSubject(bareDescriptor),
    asRef: generateIsFoundIn_AsRef_VirtualSubject(bareDescriptor)
  };
}

function generateIsEnsuredIn_WithRef_VirtualSubject(
  descriptor:
    | IsEnsuredIn<WithRefLocator>
    | Omit<IsEnsuredIn<SubjectLocator>, "locator">
): (
  predicate: Reference,
  object: Reference
) => IsEnsuredIn_WithRef_VirtualSubject {
  return (predicate: Reference, object: Reference) => {
    const locator: WithRefLocator = (descriptor as IsEnsuredIn<WithRefLocator>)
      .locator ?? { references: [] };
    const newReferences = locator.references.concat({
      predicate: predicate,
      object: object
    });
    const newDescriptor: IsEnsuredIn<WithRefLocator> = {
      ...descriptor,
      locator: { references: newReferences }
    };

    const subjectWithRefAdder: IsEnsuredIn_WithRef_VirtualSubject = {
      internal_descriptor: newDescriptor,
      withRef: generateIsEnsuredIn_WithRef_VirtualSubject(newDescriptor)
    };

    return subjectWithRefAdder;
  };
}
function generateIsEnsuredIn_AsRef_VirtualSubject(
  bareDescriptor: Omit<IsEnsuredIn<SubjectLocator>, "locator">
): (reference: Reference) => IsEnsuredIn_AsRef_VirtualSubject {
  return (reference: Reference) => {
    const descriptor: IsEnsuredIn<AsRefLocator> = {
      ...bareDescriptor,
      locator: {
        reference: reference
      }
    };
    return {
      internal_descriptor: descriptor
    };
  };
}
interface IsEnsuredIn_WithRef_VirtualSubject
  extends VirtualSubject<IsEnsuredIn<WithRefLocator>> {
  withRef: (
    predicate: Reference,
    object: Reference
  ) => IsEnsuredIn_WithRef_VirtualSubject;
}
type IsEnsuredIn_AsRef_VirtualSubject = VirtualSubject<
  IsEnsuredIn<AsRefLocator>
>;
interface IsEnsuredIn_Bare_VirtualSubject {
  internal_descriptor: Omit<IsEnsuredIn<SubjectLocator>, "locator">;
  withRef: (
    predicate: Reference,
    object: Reference
  ) => IsEnsuredIn_WithRef_VirtualSubject;
  asRef: (reference: Reference) => IsEnsuredIn_AsRef_VirtualSubject;
}
function isEnsuredIn(
  document: VirtualDocument
): IsEnsuredIn_Bare_VirtualSubject {
  const bareDescriptor: Omit<IsEnsuredIn<SubjectLocator>, "locator"> = {
    type: "IsEnsuredIn",
    document: document
  };
  return {
    internal_descriptor: bareDescriptor,
    withRef: generateIsEnsuredIn_WithRef_VirtualSubject(bareDescriptor),
    asRef: generateIsEnsuredIn_AsRef_VirtualSubject(bareDescriptor)
  };
}
