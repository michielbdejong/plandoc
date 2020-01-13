import {
  Reference,
  TripleDocument,
  LocalTripleDocument,
  fetchDocument as fetchTripleDocument,
  createDocument,
  isSavedToPod,
  TripleSubject
} from "tripledoc";
import { acl, foaf, rdf } from "rdf-namespaces";

export interface AclSettings {
  public?: {
    read?: boolean;
    append?: boolean;
    write?: boolean;
    control?: boolean;
  };
  agents?: {
    [agent: string]: {
      read?: boolean;
      append?: boolean;
      write?: boolean;
      control?: boolean;
    };
  };
  origins?: {
    [origin: string]: {
      [agent: string]: {
        read?: boolean;
        append?: boolean;
        write?: boolean;
        control?: boolean;
      };
    };
  };
}

export function hasAclSettings(aclSettings: AclSettings): boolean {
  return (
    aclSettings.public !== undefined ||
    aclSettings.origins !== undefined ||
    aclSettings.agents !== undefined
  );
}

export async function configureAcl(
  documentRef: Reference,
  aclRef: Reference,
  aclSettings: AclSettings
): Promise<TripleDocument> {
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

  const publicAclSettings = aclSettings.public;
  if (publicAclSettings !== undefined) {
    let authSubject: TripleSubject;
    if (isSavedToPod(aclDoc)) {
      const potentialSubjects = aclDoc
        .findSubjects(acl.accessTo, documentRef)
        .filter(potentialSubject => {
          return (
            potentialSubject.getRef(rdf.type) === acl.Authorization &&
            potentialSubject.getRef(acl.agentClass) === foaf.Agent
          );
        });
      authSubject =
        potentialSubjects.length === 1
          ? potentialSubjects[1]
          : aclDoc.addSubject();
    } else {
      authSubject = aclDoc.addSubject();
    }

    authSubject.setRef(rdf.type, acl.Authorization);
    authSubject.setRef(acl.accessTo, documentRef);
    authSubject.setRef(acl.agentClass, foaf.Agent);

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

  const agentAclSettings = aclSettings.agents;
  if (agentAclSettings !== undefined) {
    Object.keys(agentAclSettings).forEach(agent => {
      let authSubject: TripleSubject;
      if (isSavedToPod(aclDoc)) {
        const potentialSubjects = aclDoc
          .findSubjects(acl.accessTo, documentRef)
          .filter(potentialSubject => {
            return (
              potentialSubject.getRef(rdf.type) === acl.Authorization &&
              potentialSubject.getRef(acl.agent) === agent &&
              // Make sure that this Subject is not restricted to a specific Origin
              potentialSubject.getRef(acl.origin) === null
            );
          });
        authSubject =
          potentialSubjects.length === 1
            ? potentialSubjects[1]
            : aclDoc.addSubject();
      } else {
        authSubject = aclDoc.addSubject();
      }

      authSubject.setRef(rdf.type, acl.Authorization);
      authSubject.setRef(acl.accessTo, documentRef);
      authSubject.setRef(acl.agent, agent);

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

  const originAclSettings = aclSettings.origins;
  if (originAclSettings !== undefined) {
    Object.keys(originAclSettings).forEach(origin => {
      Object.keys(originAclSettings[origin]).forEach(agent => {
        let authSubject: TripleSubject;
        if (isSavedToPod(aclDoc)) {
          const potentialSubjects = aclDoc
            .findSubjects(acl.accessTo, documentRef)
            .filter(potentialSubject => {
              return (
                potentialSubject.getRef(rdf.type) === acl.Authorization &&
                potentialSubject.getRef(acl.agent) === agent &&
                potentialSubject.getRef(acl.origin) === origin
              );
            });
          authSubject =
            potentialSubjects.length === 1
              ? potentialSubjects[1]
              : aclDoc.addSubject();
        } else {
          authSubject = aclDoc.addSubject();
        }

        authSubject.setRef(rdf.type, acl.Authorization);
        authSubject.setRef(acl.accessTo, documentRef);
        authSubject.setRef(acl.origin, origin);
        authSubject.setRef(acl.agent, agent);

        if (originAclSettings[origin][agent].read) {
          authSubject.addRef(acl.mode, acl.Read);
        }
        if (originAclSettings[origin][agent].append) {
          authSubject.addRef(acl.mode, acl.Append);
        }
        if (originAclSettings[origin][agent].write) {
          authSubject.addRef(acl.mode, acl.Write);
        }
        if (originAclSettings[origin][agent].control) {
          authSubject.addRef(acl.mode, acl.Control);
        }
      });
    });
  }

  const savedAclDoc = await aclDoc.save();
  return savedAclDoc;
}
