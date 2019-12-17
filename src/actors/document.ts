import { TripleDocument, fetchDocument as fetchTripleDocument, createDocument } from 'tripledoc';
import { VirtualDocument } from '../virtual/document';
import { internal_isByRef, ByRef, DocumentDescriptor, internal_isIsAclFor, internal_isIsFoundOn, internal_isIsEnsuredOn, IsAclFor, IsFoundOn, IsEnsuredOn } from "../descriptors/document";
import { fetchSubject } from './subject';

export async function fetchDocument(virtualDoc: VirtualDocument): Promise<TripleDocument | null> {
  if (typeof virtualDoc.promise !== 'undefined') {
    return virtualDoc.promise;
  }

  const promise =
    internal_isByRef(virtualDoc) ? fetchByRef(virtualDoc) :
    internal_isIsAclFor(virtualDoc) ? getFromAcl(virtualDoc) :
    internal_isIsFoundOn(virtualDoc) ? getForRef(virtualDoc) :
    internal_isIsEnsuredOn(virtualDoc) ? ensureForRef(virtualDoc) :
    Promise.reject(new Error('This type of Virtual Document can not be processed yet.'));

  virtualDoc.promise = promise;

  return promise;
}

type DocumentFetcher<Locater extends DocumentDescriptor> =
  (virtualDoc: VirtualDocument<Locater>) => Promise<TripleDocument | null>;

const fetchByRef: DocumentFetcher<ByRef> = async (virtualDoc) => {
  return fetchTripleDocument(virtualDoc.internal_descriptor.reference);
};

const getFromAcl: DocumentFetcher<IsAclFor> = async (virtualDoc) => {
  const mainDocument = await fetchDocument(virtualDoc.internal_descriptor.document);
  const aclRef = mainDocument?.getAclRef();
  if (!aclRef) {
    return null;
  }
  return await fetchTripleDocument(aclRef);
};

const getForRef: DocumentFetcher<IsFoundOn> = async (virtualDoc) => {
  const subject = await fetchSubject(virtualDoc.internal_descriptor.subject);
  if (subject === null) {
    return null;
  }

  const reference = subject.getRef(virtualDoc.internal_descriptor.predicate);
  if (reference === null) {
    return null;
  }

  return fetchTripleDocument(reference);
};

const ensureForRef: DocumentFetcher<IsEnsuredOn> = async (virtualDoc) => {
  const subject = await fetchSubject(virtualDoc.internal_descriptor.subject);
  if (subject === null) {
    return null;
  }

  const reference = subject.getRef(virtualDoc.internal_descriptor.predicate);
  if (reference !== null) {
    return fetchTripleDocument(reference);
  }

  const newDocument = createDocument(virtualDoc.internal_descriptor.fallbackReference);
  await newDocument.save();

  subject.setRef(virtualDoc.internal_descriptor.predicate, newDocument.asRef());
  const subjectDoc = subject.getDocument();
  await subjectDoc.save([subject]);

  return newDocument;
};
