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

type AclConfigOptions = {
  /** Assuming [[documentRef]] is a Container, whether these settings should also apply to its children */
  default: boolean;
};
export async function configureAcl(
  documentRef: Reference,
  aclRef: Reference,
  aclSettings: AclSettings,
  options: Partial<AclConfigOptions> = {}
): Promise<TripleDocument | null> {
  let aclDoc: TripleDocument | LocalTripleDocument;
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
