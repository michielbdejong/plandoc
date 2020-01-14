import {
  fetchDocument as fetchTripleDocument,
  TripleSubject,
  TripleDocument
} from "tripledoc";
import { VirtualSubject } from "../virtual/subject";
import {
  internal_isIsFoundAt,
  internal_isIsFoundIn,
  internal_isIsEnsuredIn,
  SubjectDescriptor,
  IsFoundAt,
  IsFoundIn,
  IsEnsuredIn,
  SubjectLocator,
  WithRefLocator,
  internal_isWithRefLocator,
  internal_isAsRefLocator,
  AsRefLocator,
  IsFoundOn,
  internal_isIsFoundOn,
  internal_isIsEnsuredOn,
  IsEnsuredOn
} from "../descriptors/subject";
import { fetchDocument } from "./document";

export async function fetchSubject(
  virtualSubject: VirtualSubject
): Promise<TripleSubject | null> {
  if (typeof virtualSubject.promise !== "undefined") {
    return virtualSubject.promise;
  }

  const promise = internal_isIsFoundAt(virtualSubject)
    ? fetchByRef(virtualSubject)
    : internal_isIsFoundOn(virtualSubject)
    ? getOnSubject(virtualSubject)
    : internal_isIsEnsuredOn(virtualSubject)
    ? ensureOnSubject(virtualSubject)
    : internal_isIsFoundIn(virtualSubject)
    ? getWithRefs(virtualSubject)
    : internal_isIsEnsuredIn(virtualSubject)
    ? ensureWithRefs(virtualSubject)
    : Promise.reject(
        new Error("This type of Virtual Subject can not be processed yet.")
      );

  virtualSubject.promise = promise;

  return promise;
}

type SubjectFetcher<Descriptor extends SubjectDescriptor> = (
  virtualSubject: VirtualSubject<Descriptor>
) => Promise<TripleSubject | null>;

const fetchByRef: SubjectFetcher<IsFoundAt> = async virtualSubject => {
  const document = await fetchTripleDocument(
    virtualSubject.internal_descriptor.reference
  );
  return document.getSubject(virtualSubject.internal_descriptor.reference);
};

const getOnSubject: SubjectFetcher<IsFoundOn> = async virtualSubject => {
  const sourceSubject = await fetchSubject(
    virtualSubject.internal_descriptor.subject
  );
  if (sourceSubject === null) {
    return null;
  }
  const subjectRef = sourceSubject.getRef(
    virtualSubject.internal_descriptor.predicate
  );
  if (subjectRef === null) {
    return null;
  }
  return sourceSubject.getDocument().getSubject(subjectRef);
};

const ensureOnSubject: SubjectFetcher<IsEnsuredOn> = async virtualSubject => {
  const sourceSubject = await fetchSubject(
    virtualSubject.internal_descriptor.subject
  );
  if (sourceSubject === null) {
    return null;
  }
  const subjectRef = sourceSubject.getRef(
    virtualSubject.internal_descriptor.predicate
  );
  if (typeof subjectRef === "string") {
    return sourceSubject.getDocument().getSubject(subjectRef);
  }

  // No Subject is listed, so add a new one:
  const sourceDoc = sourceSubject.getDocument();
  const newSubject = sourceDoc.addSubject();
  sourceSubject.addRef(
    virtualSubject.internal_descriptor.predicate,
    newSubject.asRef()
  );
  const updatedDoc = await sourceDoc.save([sourceSubject, newSubject]);
  return updatedDoc.getSubject(newSubject.asRef());
};

const getWithRefs: SubjectFetcher<IsFoundIn<
  SubjectLocator
>> = async virtualSubject => {
  const document = await fetchDocument(
    virtualSubject.internal_descriptor.document
  );

  if (document === null) {
    return null;
  }

  const locator = virtualSubject.internal_descriptor.locator;
  if (internal_isWithRefLocator(locator)) {
    return getWithRefsFromDoc(document, locator);
  } else if (internal_isAsRefLocator(locator)) {
    return getAsRefFromDoc(document, locator);
  }
  throw new Error("This type of Locator can not be processed yet.");
};

function getWithRefsFromDoc(
  document: TripleDocument,
  locator: WithRefLocator
): TripleSubject | null {
  const references = locator.references;

  if (references.length === 0) {
    // TODO: Support just fetching one of the Subjects in this Document, if any
    //       (This requires an update on Tripledoc.)
    throw new Error(
      "Please specify at least one property to identify this subject with."
    );
  }

  const subjectsMatchingFirstRef = document.findSubjects(
    references[0].predicate,
    references[0].object
  );
  const matchingSubjects = subjectsMatchingFirstRef.filter(subject => {
    return references.every(
      ({ predicate, object }) => subject.getRef(predicate) === object
    );
  });

  if (matchingSubjects.length !== 1) {
    return null;
  }

  return matchingSubjects[0];
}
function getAsRefFromDoc(
  document: TripleDocument,
  locator: AsRefLocator
): TripleSubject | null {
  return document.getSubject(locator.reference);
}

const ensureWithRefs: SubjectFetcher<IsEnsuredIn<
  SubjectLocator
>> = async virtualSubject => {
  const document = await fetchDocument(
    virtualSubject.internal_descriptor.document
  );

  if (document === null) {
    return null;
  }

  const locator = virtualSubject.internal_descriptor.locator;
  if (internal_isWithRefLocator(locator)) {
    return ensureWithRefsInDoc(document, locator);
  } else if (internal_isAsRefLocator(locator)) {
    return ensureAsRefInDoc(document, locator);
  }
  throw new Error("This type of Locator can not be processed yet.");
};
async function ensureWithRefsInDoc(
  document: TripleDocument,
  locator: WithRefLocator
): Promise<TripleSubject | null> {
  const references = locator.references;
  if (references.length === 0) {
    // TODO: Support just fetching one of the Subjects in this Document, if any
    //       (This requires an update on Tripledoc.)
    throw new Error(
      "Please specify at least one property to identify this subject with."
    );
  }

  const subjectsMatchingFirstRef = document.findSubjects(
    references[0].predicate,
    references[0].object
  );
  const matchingSubjects = subjectsMatchingFirstRef.filter(subject => {
    return references.every(
      ({ predicate, object }) => subject.getRef(predicate) === object
    );
  });

  if (matchingSubjects.length > 0) {
    return matchingSubjects[0];
  }

  // No subject found with the given References, so let's create a new one:
  const newSubject = document.addSubject();
  references.forEach(reference =>
    newSubject.addRef(reference.predicate, reference.object)
  );

  const updatedDocument = await document.save([newSubject]);
  return updatedDocument.getSubject(newSubject.asRef());
}
function ensureAsRefInDoc(
  document: TripleDocument,
  locator: AsRefLocator
): TripleSubject | null {
  const subject = document.getSubject(locator.reference);
  if (subject !== null) {
    return subject;
  }

  // Usually, the reference will be a full URL, from which we only need the hash
  // (but without the leading `#`).
  // In case it's just the identifier, we first convert it to a full URL
  // relative to the Document, and then take the hash of that.
  const subjectRef = new URL(
    locator.reference,
    document.asRef()
  ).hash.substring(1);
  const newSubject = document.addSubject({ identifier: subjectRef });
  return newSubject;
}
