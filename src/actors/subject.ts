import { fetchDocument as fetchTripleDocument, TripleSubject } from "tripledoc";
import { VirtualSubject } from "../virtual/subject";
import {
  internal_isByRef,
  internal_isIsFoundIn,
  internal_isIsEnsuredIn,
  SubjectDescriptor,
  ByRef,
  IsFoundIn,
  IsEnsuredIn
} from "../descriptors/subject";
import { fetchDocument } from "./document";

export async function fetchSubject(
  virtualSubject: VirtualSubject
): Promise<TripleSubject | null> {
  if (typeof virtualSubject.promise !== "undefined") {
    return virtualSubject.promise;
  }

  const promise = internal_isByRef(virtualSubject)
    ? fetchByRef(virtualSubject)
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

type SubjectFetcher<Selecter extends SubjectDescriptor> = (
  virtualSubject: VirtualSubject<Selecter>
) => Promise<TripleSubject | null>;

const fetchByRef: SubjectFetcher<ByRef> = async virtualSubject => {
  const document = await fetchTripleDocument(
    virtualSubject.internal_descriptor.reference
  );
  return document.getSubject(virtualSubject.internal_descriptor.reference);
};

const getWithRefs: SubjectFetcher<IsFoundIn> = async virtualSubject => {
  const document = await fetchDocument(
    virtualSubject.internal_descriptor.document
  );

  if (document === null) {
    return null;
  }

  const references = virtualSubject.internal_descriptor.references;

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
};

const ensureWithRefs: SubjectFetcher<IsEnsuredIn> = async virtualSubject => {
  const document = await fetchDocument(
    virtualSubject.internal_descriptor.document
  );

  if (document === null) {
    return null;
  }

  const references = virtualSubject.internal_descriptor.references;

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
};
