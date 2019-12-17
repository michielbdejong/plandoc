import { TripleDocument, fetchDocument as fetchTripleDocument, TripleSubject } from 'tripledoc';
import { VirtualSubject, internal_isFromRef, SubjectSelecter, FromRef, internal_isEnsureWithRefs, EnsureWithRefs, internal_isGetWithRefs, GetWithRefs } from '../virtual/subject';
import { fetchDocument } from './document';

export async function fetchSubject(virtualSubject: VirtualSubject): Promise<TripleSubject | null> {
  if (typeof virtualSubject.promise !== 'undefined') {
    return virtualSubject.promise;
  }

  const promise =
    internal_isFromRef(virtualSubject) ? fetchByRef(virtualSubject) :
    internal_isGetWithRefs(virtualSubject) ? getWithRefs(virtualSubject) :
    internal_isEnsureWithRefs(virtualSubject) ? ensureWithRefs(virtualSubject) :
    Promise.reject(new Error('This type of Virtual Subject can not be processed yet.'));

  virtualSubject.promise = promise;

  return promise;
}

type SubjectFetcher<Selecter extends SubjectSelecter> =
  (virtualSubject: VirtualSubject<Selecter>) => Promise<TripleSubject | null>;


const fetchByRef: SubjectFetcher<FromRef> = async (virtualSubject) => {
  const document = await fetchTripleDocument(virtualSubject.internalRepresentation().reference);
  return document.getSubject(virtualSubject.internalRepresentation().reference);
};

const getWithRefs: SubjectFetcher<GetWithRefs> = async (virtualSubject) => {
  const document = await fetchDocument(virtualSubject.internalRepresentation().document);

  if (document === null) {
    return null;
  }

  const references = virtualSubject.internalRepresentation().references;
  const subjectsMatchingFirstRef = document.findSubjects(
    references[0].predicate,
    references[0].object,
  )
  const matchingSubjects = subjectsMatchingFirstRef.filter((subject) => {
    return references.every(({ predicate, object}) => subject.getRef(predicate) === object);
  });

  if (matchingSubjects.length !== 1) {
    return null;
  }

  return matchingSubjects[0];
};

const ensureWithRefs: SubjectFetcher<EnsureWithRefs> = async (virtualSubject) => {
  const document = await fetchDocument(virtualSubject.internalRepresentation().document);

  if (document === null) {
    return null;
  }

  const references = virtualSubject.internalRepresentation().references;
  const subjectsMatchingFirstRef = document.findSubjects(
    references[0].predicate,
    references[0].object,
  )
  const matchingSubjects = subjectsMatchingFirstRef.filter((subject) => {
    return references.every(({ predicate, object}) => subject.getRef(predicate) === object);
  });

  if (matchingSubjects.length > 0) {
    return matchingSubjects[0];
  }

  // No subject found with the given References, so let's create a new one:
  const newSubject = document.addSubject();
  references.forEach((reference) => newSubject.addRef(reference.predicate, reference.object));

  const updatedDocument = await document.save([newSubject]);
  return updatedDocument.getSubject(newSubject.asRef());
};
