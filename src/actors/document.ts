import {
  TripleDocument,
  fetchDocument as fetchTripleDocument,
  createDocumentInContainer
} from "tripledoc";
import { VirtualDocument } from "../virtual/document";
import {
  internal_isIsFoundAt,
  IsFoundAt,
  DocumentDescriptor,
  internal_isIsAclFor,
  internal_isIsFoundOn,
  internal_isIsEnsuredOn,
  IsAclFor,
  IsFoundOn,
  IsEnsuredOn
} from "../descriptors/document";
import { internal_fetchSubject } from "./subject";
import { internal_fetchContainer } from "./container";
import { hasAclSettings, configureAcl } from "../services/acl";

export async function fetchDocument(
  virtualDoc: VirtualDocument
): Promise<TripleDocument | null> {
  if (typeof virtualDoc.promise !== "undefined") {
    return virtualDoc.promise;
  }

  const promise = internal_isIsFoundAt(virtualDoc)
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

  const wrappedPromise = promise.then(fetchedDocument => {
    if (fetchedDocument !== null) {
      // Update the cached Promise to return the updated Document when accessed again:
      const wrappedSave: typeof fetchedDocument.save = subjects => {
        const savePromise = fetchedDocument.save(subjects);
        virtualDoc.promise = savePromise;
        return savePromise;
      };

      return {
        ...fetchedDocument,
        save: wrappedSave
      };
    }

    return null;
  });

  virtualDoc.promise = wrappedPromise;

  return wrappedPromise;
}

type DocumentFetcher<Descriptor extends DocumentDescriptor> = (
  virtualDoc: VirtualDocument<Descriptor>
) => Promise<TripleDocument | null>;

const fetchByRef: DocumentFetcher<IsFoundAt> = async virtualDoc => {
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
  const subject = await internal_fetchSubject(
    virtualDoc.internal_descriptor.subject
  );
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
  const subject = await internal_fetchSubject(
    virtualDoc.internal_descriptor.subject
  );
  if (subject === null) {
    return null;
  }

  const reference = subject.getRef(virtualDoc.internal_descriptor.predicate);
  if (reference !== null) {
    return fetchTripleDocument(reference);
  }

  const container = await internal_fetchContainer(
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
