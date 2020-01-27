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

/**
 * Construct a [[VirtualSubject]].
 *
 * This function allows you to programmatically construct a [[VirtualSubject]] by chaining
 * together a number of functions.
 */
export function describeSubject() {
  return {
    isFoundAt: isFoundAt,
    isFoundOn: isFoundOn,
    isEnsuredOn: isEnsuredOn,
    isFoundIn: isFoundIn,
    isEnsuredIn: isEnsuredIn
  };
}

/**
 * A representation of how to get to a given Subject.
 */
export interface VirtualSubject<
  Descriptor extends SubjectDescriptor = SubjectDescriptor
> {
  promise?: Promise<TripleSubject | null>;
  /**
   * @ignore
   */
  internal_descriptor: Descriptor;
}

/**
 * Describe a Subject for which you know the IRI.
 *
 * @param reference IRI of the desired Subject.
 */
function isFoundAt(reference: Reference): VirtualSubject<IsFoundAt> {
  const descriptor: IsFoundAt = {
    reference: reference,
    type: "IsFoundAt"
  };
  return {
    internal_descriptor: descriptor
  };
}

/**
 * Describe a Subject that is referred to by a given other Subject.
 *
 * @param subject [[VirtualSubject]] describing the Subject that points to this Subject.
 * @param predicate Predicate that is used on `subject` to point to this Subject.
 */
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

/**
 * Describe a Subject that should be referred to by a given other Subject.
 *
 * If the given Subject does not refer to another Subject yet for the given Predicate, a new Subject
 * will be created inside that Subject's containing Document and added to the given Subject for the
 * given Predicate.
 *
 * @param subject [[VirtualSubject]] describing the Subject that points to this Subject.
 * @param predicate Predicate that is used on `subject` to point to this Subject.
 */
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

/**
 * @ignore Internal API.
 */
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
/**
 * @ignore Internal API.
 */
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
/**
 * @ignore Internal data structure.
 */
interface IsFoundIn_WithRef_VirtualSubject
  extends VirtualSubject<IsFoundIn<WithRefLocator>> {
  withRef: (
    predicate: Reference,
    object: Reference
  ) => IsFoundIn_WithRef_VirtualSubject;
}
/**
 * @ignore Internal data structure.
 */
type IsFoundIn_AsRef_VirtualSubject = VirtualSubject<IsFoundIn<AsRefLocator>>;
/**
 * @ignore Internal data structure.
 */
interface IsFoundIn_Bare_VirtualSubject {
  internal_descriptor: Omit<IsFoundIn<SubjectLocator>, "locator">;
  withRef: (
    predicate: Reference,
    object: Reference
  ) => IsFoundIn_WithRef_VirtualSubject;
  asRef: (reference: Reference) => IsFoundIn_AsRef_VirtualSubject;
}

/**
 * Describe a Subject that is contained in a given Document.
 *
 * @param document [[VirtualDocument]] describing the Document that contains to this Subject.
 */
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

/**
 * @ignore Internal API.
 */
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
/**
 * @ignore Internal API.
 */
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
/**
 * @ignore Internal data structure.
 */
interface IsEnsuredIn_WithRef_VirtualSubject
  extends VirtualSubject<IsEnsuredIn<WithRefLocator>> {
  withRef: (
    predicate: Reference,
    object: Reference
  ) => IsEnsuredIn_WithRef_VirtualSubject;
}
/**
 * @ignore Internal data structure.
 */
type IsEnsuredIn_AsRef_VirtualSubject = VirtualSubject<
  IsEnsuredIn<AsRefLocator>
>;
/**
 * @ignore Internal data structure.
 */
interface IsEnsuredIn_Bare_VirtualSubject {
  internal_descriptor: Omit<IsEnsuredIn<SubjectLocator>, "locator">;
  withRef: (
    predicate: Reference,
    object: Reference
  ) => IsEnsuredIn_WithRef_VirtualSubject;
  asRef: (reference: Reference) => IsEnsuredIn_AsRef_VirtualSubject;
}

/**
 * Describe a Subject that should be contained in a given Document.
 *
 * @param document [[VirtualDocument]] describing the Document that should contain this Subject.
 */
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
