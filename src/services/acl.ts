import {
  Reference,
  TripleDocument,
  LocalTripleDocumentWithRef,
  fetchDocument as fetchTripleDocument,
  createDocument,
  isSavedToPod,
  TripleSubject
} from "tripledoc";

// Common vocab IRI's inlined to avoid inadvertently bundling a full copy of rdf-namespaces
// in projects that do not have a bundler/tree-shaking set up.
const acl = {
  Authorization: "http://www.w3.org/ns/auth/acl#Authorization",
  Read: "http://www.w3.org/ns/auth/acl#Read",
  Append: "http://www.w3.org/ns/auth/acl#Append",
  Write: "http://www.w3.org/ns/auth/acl#Write",
  Control: "http://www.w3.org/ns/auth/acl#Control",
  accessTo: "http://www.w3.org/ns/auth/acl#accessTo",
  agent: "http://www.w3.org/ns/auth/acl#agent",
  agentClass: "http://www.w3.org/ns/auth/acl#agentClass",
  default__workaround: "http://www.w3.org/ns/auth/acl#default",
  defaultForNew: "http://www.w3.org/ns/auth/acl#defaultForNew",
  mode: "http://www.w3.org/ns/auth/acl#mode",
  origin: "http://www.w3.org/ns/auth/acl#origin"
};
const foaf = { Agent: "http://xmlns.com/foaf/0.1/Agent" };
const rdf = { type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" };

/**
 * @ignore Experimental API.
 */
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

/**
 * @ignore Internal API.
 */
export function hasAclSettings(aclSettings: AclSettings): boolean {
  return (
    aclSettings.public !== undefined ||
    aclSettings.origins !== undefined ||
    aclSettings.agents !== undefined
  );
}

/**
 * @ignore Internal data structure.
 */
type AclConfigOptions = {
  /** Assuming [[documentRef]] is a Container, whether these settings should also apply to its children */
  default: boolean;
};
/**
 * @ignore Internal API.
 */
export async function configureAcl(
  documentRef: Reference,
  aclRef: Reference,
  aclSettings: AclSettings,
  options: Partial<AclConfigOptions> = {}
): Promise<TripleDocument | null> {
  let aclDoc: TripleDocument | LocalTripleDocumentWithRef;
  if (!hasAclSettings(aclSettings)) {
    return null;
  }

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
      const potentialSubjects = (aclDoc as TripleDocument)
        .findSubjects(acl.accessTo, documentRef)
        .filter(potentialSubject => {
          return (
            potentialSubject.getRef(rdf.type) === acl.Authorization &&
            potentialSubject.getRef(acl.agentClass) === foaf.Agent
          );
        });
      authSubject =
        potentialSubjects.length === 1
          ? potentialSubjects[0]
          : aclDoc.addSubject();
    } else {
      authSubject = aclDoc.addSubject();
    }

    authSubject.setRef(rdf.type, acl.Authorization);
    authSubject.setRef(acl.accessTo, documentRef);
    authSubject.setRef(acl.agentClass, foaf.Agent);

    if (options.default) {
      authSubject.addRef(acl.default__workaround, documentRef);
      // Deprecated, but included for backwards compatibility:
      authSubject.addRef(acl.defaultForNew, documentRef);
    }

    if (publicAclSettings.read === true) {
      authSubject.addRef(acl.mode, acl.Read);
    } else if (publicAclSettings.read === false) {
      authSubject.removeRef(acl.mode, acl.Read);
    }
    if (publicAclSettings.append === true) {
      authSubject.addRef(acl.mode, acl.Append);
    } else if (publicAclSettings.append === false) {
      authSubject.removeRef(acl.mode, acl.Append);
    }
    if (publicAclSettings.write === true) {
      authSubject.addRef(acl.mode, acl.Write);
    } else if (publicAclSettings.write === false) {
      authSubject.removeRef(acl.mode, acl.Write);
    }
    if (publicAclSettings.control === true) {
      authSubject.addRef(acl.mode, acl.Control);
    } else if (publicAclSettings.control === false) {
      authSubject.removeRef(acl.mode, acl.Control);
    }
  }

  const agentAclSettings = aclSettings.agents;
  if (agentAclSettings !== undefined) {
    Object.keys(agentAclSettings).forEach(agent => {
      let authSubject: TripleSubject;
      if (isSavedToPod(aclDoc)) {
        const potentialSubjects = (aclDoc as TripleDocument)
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
            ? potentialSubjects[0]
            : aclDoc.addSubject();
      } else {
        authSubject = aclDoc.addSubject();
      }

      authSubject.setRef(rdf.type, acl.Authorization);
      authSubject.setRef(acl.accessTo, documentRef);
      authSubject.setRef(acl.agent, agent);

      if (options.default) {
        authSubject.addRef(acl.default__workaround, documentRef);
        // Deprecated, but included for backwards compatibility:
        authSubject.addRef(acl.defaultForNew, documentRef);
      }

      if (agentAclSettings[agent].read === true) {
        authSubject.addRef(acl.mode, acl.Read);
      } else if (agentAclSettings[agent].read === false) {
        authSubject.removeRef(acl.mode, acl.Read);
      }
      if (agentAclSettings[agent].append === true) {
        authSubject.addRef(acl.mode, acl.Append);
      } else if (agentAclSettings[agent].append === false) {
        authSubject.removeRef(acl.mode, acl.Append);
      }
      if (agentAclSettings[agent].write === true) {
        authSubject.addRef(acl.mode, acl.Write);
      } else if (agentAclSettings[agent].write === false) {
        authSubject.removeRef(acl.mode, acl.Write);
      }
      if (agentAclSettings[agent].control === true) {
        authSubject.addRef(acl.mode, acl.Control);
      } else if (agentAclSettings[agent].control === false) {
        authSubject.removeRef(acl.mode, acl.Control);
      }
    });
  }

  const originAclSettings = aclSettings.origins;
  if (originAclSettings !== undefined) {
    Object.keys(originAclSettings).forEach(origin => {
      Object.keys(originAclSettings[origin]).forEach(agent => {
        let authSubject: TripleSubject;
        if (isSavedToPod(aclDoc)) {
          const potentialSubjects = (aclDoc as TripleDocument)
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
              ? potentialSubjects[0]
              : aclDoc.addSubject();
        } else {
          authSubject = aclDoc.addSubject();
        }

        authSubject.setRef(rdf.type, acl.Authorization);
        authSubject.setRef(acl.accessTo, documentRef);
        authSubject.setRef(acl.origin, origin);
        authSubject.setRef(acl.agent, agent);

        if (options.default) {
          authSubject.addRef(acl.default__workaround, documentRef);
          // Deprecated, but included for backwards compatibility:
          authSubject.addRef(acl.defaultForNew, documentRef);
        }

        if (originAclSettings[origin][agent].read === true) {
          authSubject.addRef(acl.mode, acl.Read);
        } else if (originAclSettings[origin][agent].read === false) {
          authSubject.removeRef(acl.mode, acl.Read);
        }
        if (originAclSettings[origin][agent].append === true) {
          authSubject.addRef(acl.mode, acl.Append);
        } else if (originAclSettings[origin][agent].append === false) {
          authSubject.removeRef(acl.mode, acl.Append);
        }
        if (originAclSettings[origin][agent].write === true) {
          authSubject.addRef(acl.mode, acl.Write);
        } else if (originAclSettings[origin][agent].write === false) {
          authSubject.removeRef(acl.mode, acl.Write);
        }
        if (originAclSettings[origin][agent].control === true) {
          authSubject.addRef(acl.mode, acl.Control);
        } else if (originAclSettings[origin][agent].control === false) {
          authSubject.removeRef(acl.mode, acl.Control);
        }
      });
    });
  }

  const savedAclDoc = await aclDoc.save();
  return savedAclDoc;
}
