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

  if (configuresAcl(virtualDoc.internal_descriptor)) {
    const aclRef = savedDocument.getAclRef();
    if (aclRef === null) {
      throw new Error(
        "Could not find a location for the Access Control List of this Document."
      );
    }
    let aclDoc: TripleDocument | LocalTripleDocument;
    try {
      aclDoc = await fetchTripleDocument(aclRef);
    } catch (e) {
      aclDoc = createDocument(aclRef);
    }
    if (aclDoc === undefined) {
      throw new Error(
        "Could not fetch the Access Control List of this Document."
      );
    }

    const publicAclSettings = virtualDoc.internal_descriptor.acl.public;
    if (publicAclSettings !== undefined) {
      const authSubject = isSavedToPod(aclDoc)
        ? // If the ACL exists on the Pod, use an existing Subject for public ACL access if present,
          // or add a new Subject otherwise:
          aclDoc.findSubject(acl.agentClass, foaf.Agent) ?? aclDoc.addSubject()
        : // If the ACL doesn't exist on the Pod yet, just add a new Subject:
          aclDoc.addSubject();

      authSubject.addRef(rdf.type, acl.Authorization);
      authSubject.addRef(acl.accessTo, savedDocument.asRef());

      if (publicAclSettings.read) {
        authSubject.addRef(acl.mode, acl.Read);
      }
      if (publicAclSettings.append) {
        authSubject.addRef(acl.mode, acl.Append);
      }
      if (publicAclSettings.write) {
        authSubject.addRef(acl.mode, acl.Write);
      }
      if (publicAclSettings.control) {
        authSubject.addRef(acl.mode, acl.Control);
      }
    }

    const agentAclSettings = virtualDoc.internal_descriptor.acl.agents;
    if (agentAclSettings !== undefined) {
      Object.keys(agentAclSettings).forEach(agent => {
        const authSubject = isSavedToPod(aclDoc)
          ? // If the ACL exists on the Pod, use an existing Subject for agent-specific ACL access
            //if present, or add a new Subject otherwise:
            aclDoc.findSubject(acl.agent, agent) ?? aclDoc.addSubject()
          : // If the ACL doesn't exist on the Pod yet, just add a new Subject:
            aclDoc.addSubject();

        authSubject.addRef(rdf.type, acl.Authorization);
        authSubject.addRef(acl.accessTo, savedDocument.asRef());

        if (agentAclSettings[agent].read) {
          authSubject.addRef(acl.mode, acl.Read);
        }
        if (agentAclSettings[agent].append) {
          authSubject.addRef(acl.mode, acl.Append);
        }
        if (agentAclSettings[agent].write) {
          authSubject.addRef(acl.mode, acl.Write);
        }
        if (agentAclSettings[agent].control) {
          authSubject.addRef(acl.mode, acl.Control);
        }
      });
    }
    // TODO: ACL settings for origins

    await aclDoc.save();
  }

  return savedDocument;
};

function configuresAcl(descriptor: IsEnsuredOn): boolean {
  return (
    descriptor.acl.public !== undefined ||
    descriptor.acl.origins !== undefined ||
    descriptor.acl.agents !== undefined
  );
}
