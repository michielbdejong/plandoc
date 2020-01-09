import {
  TripleDocument,
  fetchDocument as fetchTripleDocument,
  createDocument,
  createDocumentInContainer,
  LocalTripleDocument,
  isSavedToPod
} from "tripledoc";
import { foaf, acl, rdf } from "rdf-namespaces";
import { VirtualDocument } from "../virtual/document";
import {
  internal_isByRef,
  ByRef,
  DocumentDescriptor,
  internal_isIsAclFor,
  internal_isIsFoundOn,
  internal_isIsEnsuredOn,
  IsAclFor,
  IsFoundOn,
  IsEnsuredOn
} from "../descriptors/document";
import { fetchSubject } from "./subject";
import { fetchContainer } from "./container";
import { hasAclSettings, configureAcl } from "../services/acl";

export async function fetchDocument(
  virtualDoc: VirtualDocument
): Promise<TripleDocument | null> {
  if (typeof virtualDoc.promise !== "undefined") {
    return virtualDoc.promise;
  }

  const promise = internal_isByRef(virtualDoc)
    ? fetchByRef(virtualDoc)
    : internal_isIsAclFor(virtualDoc)
    ? getFromAcl(virtualDoc)
    : internal_isIsFoundOn(virtualDoc)
    ? getForRef(virtualDoc)
    : internal_isIsEnsuredOn(virtualDoc)
    ? ensureForRef(virtualDoc)
    : Promise.reject(
        new Error("This type of Virtual Document can not be processed yet.")
      );

  virtualDoc.promise = promise;

  return promise;
}

type DocumentFetcher<Descriptor extends DocumentDescriptor> = (
  virtualDoc: VirtualDocument<Descriptor>
) => Promise<TripleDocument | null>;

const fetchByRef: DocumentFetcher<ByRef> = async virtualDoc => {
  return fetchTripleDocument(virtualDoc.internal_descriptor.reference);
};

const getFromAcl: DocumentFetcher<IsAclFor> = async virtualDoc => {
  const mainDocument = await fetchDocument(
    virtualDoc.internal_descriptor.document
  );
  const aclRef = mainDocument?.getAclRef();
  if (!aclRef) {
    return null;
  }
  return await fetchTripleDocument(aclRef);
};

const getForRef: DocumentFetcher<IsFoundOn> = async virtualDoc => {
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

const ensureForRef: DocumentFetcher<IsEnsuredOn> = async virtualDoc => {
  const subject = await fetchSubject(virtualDoc.internal_descriptor.subject);
  if (subject === null) {
    return null;
  }

  const reference = subject.getRef(virtualDoc.internal_descriptor.predicate);
  if (reference !== null) {
    return fetchTripleDocument(reference);
  }

  const container = await fetchContainer(
    virtualDoc.internal_descriptor.fallbackContainer
  );
  if (!container) {
    return null;
  }

  const newDocument = createDocumentInContainer(container);
  const savedDocument = await newDocument.save();

  subject.setRef(
    virtualDoc.internal_descriptor.predicate,
    savedDocument.asRef()
  );
  const subjectDoc = subject.getDocument();
  await subjectDoc.save([subject]);

  if (hasAclSettings(virtualDoc.internal_descriptor.acl)) {
    const aclRef = savedDocument.getAclRef();
    if (aclRef === null) {
      throw new Error(
        "Could not find a location for the Access Control List of this Document."
      );
    }
    await configureAcl(
      savedDocument.asRef(),
      aclRef,
      virtualDoc.internal_descriptor.acl
    );
  }

  return savedDocument;
};
