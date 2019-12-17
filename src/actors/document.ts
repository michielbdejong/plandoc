import { TripleDocument, fetchDocument as fetchTripleDocument, createDocument } from 'tripledoc';
import { VirtualDocument, internal_isGetByRef, GetByRef, DocumentLocater, internal_isEnsureForRef, EnsureForRef, GetForRef, internal_isGetForRef, internal_isGetFromAcl, GetFromAcl } from '../virtual/document';
import { fetchSubject } from './subject';

export async function fetchDocument(virtualDoc: VirtualDocument): Promise<TripleDocument | null> {
  if (typeof virtualDoc.promise !== 'undefined') {
    return virtualDoc.promise;
  }

  const promise =
    internal_isGetByRef(virtualDoc) ? fetchByRef(virtualDoc) :
    internal_isGetFromAcl(virtualDoc) ? getFromAcl(virtualDoc) :
    internal_isGetForRef(virtualDoc) ? getForRef(virtualDoc) :
    internal_isEnsureForRef(virtualDoc) ? ensureForRef(virtualDoc) :
    Promise.reject(new Error('This type of Virtual Document can not be processed yet.'));

  virtualDoc.promise = promise;

  return promise;
}

type DocumentFetcher<Locater extends DocumentLocater> =
  (virtualDoc: VirtualDocument<Locater>) => Promise<TripleDocument | null>;

const fetchByRef: DocumentFetcher<GetByRef> = async (virtualDoc) => {
  return fetchTripleDocument(virtualDoc.internalRepresentation().reference);
};

const getFromAcl: DocumentFetcher<GetFromAcl> = async (virtualDoc) => {
  const mainDocument = await fetchDocument(virtualDoc.internalRepresentation().document);
  const aclRef = mainDocument?.getAclRef();
  if (!aclRef) {
    return null;
  }
  return await fetchTripleDocument(aclRef);
};

const getForRef: DocumentFetcher<GetForRef> = async (virtualDoc) => {
  const subject = await fetchSubject(virtualDoc.internalRepresentation().subject);
  if (subject === null) {
    return null;
  }

  const reference = subject.getRef(virtualDoc.internalRepresentation().predicate);
  if (reference === null) {
    return null;
  }

  return fetchTripleDocument(reference);
};

const ensureForRef: DocumentFetcher<EnsureForRef> = async (virtualDoc) => {
  const subject = await fetchSubject(virtualDoc.internalRepresentation().subject);
  if (subject === null) {
    return null;
  }

  const reference = subject.getRef(virtualDoc.internalRepresentation().predicate);
  if (reference !== null) {
    return fetchTripleDocument(reference);
  }

  const newDocument = createDocument(virtualDoc.internalRepresentation().fallbackReference);
  await newDocument.save();

  subject.setRef(virtualDoc.internalRepresentation().predicate, newDocument.asRef());
  const subjectDoc = subject.getDocument();
  await subjectDoc.save([subject]);

  return newDocument;
};
