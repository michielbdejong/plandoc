import { rdf, acl, foaf } from "rdf-namespaces";
import { configureAcl } from "./acl";
import { Reference } from "tripledoc";

let mockSubject: { [key: string]: jest.Mock };
let mockDocument: { [key: string]: jest.Mock };
function initialiseMocks() {
  // `jest.mock` is run first by Jest, so any initialisation of mock globals should be done in there.
  // Thus, this function is called in there. However, we only want to initialise the mocks once so
  // as not to override their values.
  if (typeof mockSubject !== "undefined") {
    return;
  }

  mockSubject = {
    addRef: jest.fn(),
    removeRef: jest.fn(),
    setRef: jest.fn()
  };
  mockDocument = {
    addSubject: jest.fn(() => mockSubject),
    save: jest.fn(() => Promise.resolve(mockDocument))
  };
}
jest.mock("tripledoc", () => {
  initialiseMocks();
  return {
    fetchDocument: jest.fn(async () => {
      throw new Error("Mock Document does not exist yet");
    }),
    createDocument: jest.fn(() => mockDocument),
    isSavedToPod: jest.fn(() => false)
  };
});

describe("configureAcl", () => {
  it("should not modify the ACL doc if there are no requirements for it", async () => {
    const mockedTripledoc = require.requireMock("tripledoc");

    const result = await configureAcl(
      "https://arbitrary.pod/document.ttl",
      "https://arbitrary.pod/document.ttl.acl",
      {}
    );

    expect(result).toBeNull();
    expect(mockedTripledoc.fetchDocument.mock.calls.length).toBe(0);
    expect(mockedTripledoc.createDocument.mock.calls.length).toBe(0);
  });

  it("should be able to set up multiple types of permissions", async () => {
    const mockSubject1 = {
      ...mockSubject,
      setRef: jest.fn(),
      addRef: jest.fn()
    };
    const mockSubject2 = {
      ...mockSubject,
      setRef: jest.fn(),
      addRef: jest.fn()
    };
    const mockSubject3 = {
      ...mockSubject,
      setRef: jest.fn(),
      addRef: jest.fn()
    };
    mockDocument.addSubject.mockReturnValueOnce(mockSubject1);
    mockDocument.addSubject.mockReturnValueOnce(mockSubject2);
    mockDocument.addSubject.mockReturnValueOnce(mockSubject3);

    await configureAcl(
      "https://some.pod/document.ttl",
      "https://some.pod/document.ttl.acl",
      {
        public: {
          append: true
        },
        agents: {
          "https://some.pod/webid.ttl": {
            control: true
          }
        },
        origins: {
          "https://some.app": {
            "https://some.pod/webid.ttl": {
              read: true
            }
          }
        }
      }
    );

    // Public ACL settings
    expect(mockSubject1.setRef.mock.calls.length).toBe(3);
    expect(mockSubject1.setRef.mock.calls[0][0]).toBe(rdf.type);
    expect(mockSubject1.setRef.mock.calls[0][1]).toBe(acl.Authorization);
    expect(mockSubject1.setRef.mock.calls[1][0]).toBe(acl.accessTo);
    expect(mockSubject1.setRef.mock.calls[1][1]).toBe(
      "https://some.pod/document.ttl"
    );
    expect(mockSubject1.setRef.mock.calls[2][0]).toBe(acl.agentClass);
    expect(mockSubject1.setRef.mock.calls[2][1]).toBe(foaf.Agent);
    expect(mockSubject1.addRef.mock.calls[0][0]).toBe(acl.mode);
    expect(mockSubject1.addRef.mock.calls[0][1]).toBe(acl.Append);

    // An agent-specific ACL
    expect(mockSubject2.setRef.mock.calls.length).toBe(3);
    expect(mockSubject2.setRef.mock.calls[0][0]).toBe(rdf.type);
    expect(mockSubject2.setRef.mock.calls[0][1]).toBe(acl.Authorization);
    expect(mockSubject2.setRef.mock.calls[1][0]).toBe(acl.accessTo);
    expect(mockSubject2.setRef.mock.calls[1][1]).toBe(
      "https://some.pod/document.ttl"
    );
    expect(mockSubject2.setRef.mock.calls[2][0]).toBe(acl.agent);
    expect(mockSubject2.setRef.mock.calls[2][1]).toBe(
      "https://some.pod/webid.ttl"
    );
    expect(mockSubject2.addRef.mock.calls[0][0]).toBe(acl.mode);
    expect(mockSubject2.addRef.mock.calls[0][1]).toBe(acl.Control);

    // An agent-origin combination ACL
    expect(mockSubject3.setRef.mock.calls.length).toBe(4);
    expect(mockSubject3.setRef.mock.calls[0][0]).toBe(rdf.type);
    expect(mockSubject3.setRef.mock.calls[0][1]).toBe(acl.Authorization);
    expect(mockSubject3.setRef.mock.calls[1][0]).toBe(acl.accessTo);
    expect(mockSubject3.setRef.mock.calls[1][1]).toBe(
      "https://some.pod/document.ttl"
    );
    expect(mockSubject3.setRef.mock.calls[2][0]).toBe(acl.origin);
    expect(mockSubject3.setRef.mock.calls[2][1]).toBe("https://some.app");
    expect(mockSubject3.setRef.mock.calls[3][0]).toBe(acl.agent);
    expect(mockSubject3.setRef.mock.calls[3][1]).toBe(
      "https://some.pod/webid.ttl"
    );
    expect(mockSubject3.addRef.mock.calls[0][0]).toBe(acl.mode);
    expect(mockSubject3.addRef.mock.calls[0][1]).toBe(acl.Read);
  });

  describe("public ACL settings", () => {
    it("should be able to make a resource publicly readable in a new ACL file", async () => {
      await configureAcl(
        "https://some.pod/document.ttl",
        "https://some.pod/document.ttl.acl",
        {
          public: {
            read: true
          }
        }
      );

      expect(mockSubject.setRef.mock.calls.length).toBe(3);
      expect(mockSubject.setRef.mock.calls[0][0]).toBe(rdf.type);
      expect(mockSubject.setRef.mock.calls[0][1]).toBe(acl.Authorization);
      expect(mockSubject.setRef.mock.calls[1][0]).toBe(acl.accessTo);
      expect(mockSubject.setRef.mock.calls[1][1]).toBe(
        "https://some.pod/document.ttl"
      );
      expect(mockSubject.setRef.mock.calls[2][0]).toBe(acl.agentClass);
      expect(mockSubject.setRef.mock.calls[2][1]).toBe(foaf.Agent);
      expect(mockSubject.addRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[0][1]).toBe(acl.Read);
    });

    it("should mark the ACL config to apply to Documents within a Container as well", async () => {
      await configureAcl(
        "https://some.pod/container/",
        "https://arbitrary.pod/container/.acl",
        {
          public: {
            read: true
          }
        },
        { default: true }
      );

      expect(mockSubject.addRef.mock.calls[0][0]).toBe(acl.default__workaround);
      expect(mockSubject.addRef.mock.calls[0][1]).toBe(
        "https://some.pod/container/"
      );
      expect(mockSubject.addRef.mock.calls[1][0]).toBe(acl.defaultForNew);
      expect(mockSubject.addRef.mock.calls[1][1]).toBe(
        "https://some.pod/container/"
      );
    });

    it("should not try to create a new ACL file if one exists", async () => {
      const mockedTripledoc = require.requireMock("tripledoc");
      mockedTripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve(mockDocument)
      );

      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          public: {
            read: true
          }
        }
      );

      expect(mockedTripledoc.createDocument.mock.calls.length).toBe(0);
    });

    it("should throw an error if the ACL file could not be found for some reason", async () => {
      const mockedTripledoc = require.requireMock("tripledoc");
      mockedTripledoc.createDocument.mockReturnValueOnce(undefined);

      await expect(
        configureAcl(
          "https://arbitrary.pod/document.ttl",
          "https://arbitrary.pod/document.ttl.acl",
          {
            public: {
              read: true
            }
          }
        )
      ).rejects.toThrowError(
        "Could not fetch the Access Control List of this Document."
      );
    });

    it("should support setting all types of modes", async () => {
      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          public: {
            read: true,
            append: true,
            write: true,
            control: true
          }
        }
      );

      expect(mockSubject.addRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[1][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[2][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[3][0]).toBe(acl.mode);
      const setModes = [
        mockSubject.addRef.mock.calls[0][1],
        mockSubject.addRef.mock.calls[1][1],
        mockSubject.addRef.mock.calls[2][1],
        mockSubject.addRef.mock.calls[3][1]
      ];
      expect(setModes).toContain(acl.Read);
      expect(setModes).toContain(acl.Append);
      expect(setModes).toContain(acl.Write);
      expect(setModes).toContain(acl.Control);
    });

    it("should unset modes explicitly set to false", async () => {
      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          public: {
            read: false,
            append: false,
            write: false,
            control: false
          }
        }
      );

      expect(mockSubject.addRef.mock.calls.length).toBe(0);
      expect(mockSubject.removeRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.removeRef.mock.calls[1][0]).toBe(acl.mode);
      expect(mockSubject.removeRef.mock.calls[2][0]).toBe(acl.mode);
      expect(mockSubject.removeRef.mock.calls[3][0]).toBe(acl.mode);
      const unsetModes = [
        mockSubject.removeRef.mock.calls[0][1],
        mockSubject.removeRef.mock.calls[1][1],
        mockSubject.removeRef.mock.calls[2][1],
        mockSubject.removeRef.mock.calls[3][1]
      ];
      expect(unsetModes).toContain(acl.Read);
      expect(unsetModes).toContain(acl.Append);
      expect(unsetModes).toContain(acl.Write);
      expect(unsetModes).toContain(acl.Control);
    });

    it("should ignore modes that were not configured", async () => {
      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          public: {
            append: false
          }
        }
      );

      expect(mockSubject.addRef.mock.calls.length).toBe(0);
      expect(mockSubject.removeRef.mock.calls.length).toBe(1);
      expect(mockSubject.removeRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.removeRef.mock.calls[0][1]).toBe(acl.Append);
    });

    it("should re-use existing public ACL rules if available", async () => {
      const mockExistingGetRef = (ref: Reference) => {
        if (ref === rdf.type) {
          return acl.Authorization;
        }
        if (ref === acl.agentClass) {
          return foaf.Agent;
        }
        if (ref === acl.accessTo) {
          return "https://some.pod/document.ttl";
        }
      };
      const mockExistingAclRule: { [key: string]: jest.Mock } = {
        ...mockSubject,
        addRef: jest.fn(),
        getRef: jest.fn(mockExistingGetRef)
      };
      const mockedTripledoc = require.requireMock("tripledoc");
      mockedTripledoc.isSavedToPod.mockReturnValueOnce(true);
      mockedTripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve({
          ...mockDocument,
          findSubjects: () => [mockExistingAclRule]
        })
      );

      await configureAcl(
        "https://some.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          public: {
            read: true
          }
        }
      );

      expect(mockExistingAclRule.addRef.mock.calls.length).toBe(1);
      expect(mockExistingAclRule.addRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockExistingAclRule.addRef.mock.calls[0][1]).toBe(acl.Read);
    });

    it("should add a new Subject to an existing Document if no matching Subject was available yet", async () => {
      const mockNewAclRule = { ...mockSubject };
      const mockedTripledoc = require.requireMock("tripledoc");
      const mockExistingDocument: { [key: string]: jest.Mock } = {
        ...mockDocument,
        findSubjects: jest.fn(() => []),
        addSubject: jest.fn(() => mockNewAclRule)
      };
      mockedTripledoc.isSavedToPod.mockReturnValueOnce(true);
      mockedTripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve(mockExistingDocument)
      );

      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          public: {
            read: true
          }
        }
      );

      expect(mockNewAclRule.addRef.mock.calls.length).toBe(1);
      expect(mockNewAclRule.addRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockNewAclRule.addRef.mock.calls[0][1]).toBe(acl.Read);
      expect(mockExistingDocument.addSubject.mock.calls.length).toBe(1);
    });
  });

  describe("agent-specific ACL settings", () => {
    it("should be able to make a resource readable to a specific agent in a new ACL file", async () => {
      await configureAcl(
        "https://some.pod/document.ttl",
        "https://some.pod/document.ttl.acl",
        {
          agents: {
            "https://some.pod/webid.ttl": {
              read: true
            }
          }
        }
      );

      expect(mockSubject.setRef.mock.calls.length).toBe(3);
      expect(mockSubject.setRef.mock.calls[0][0]).toBe(rdf.type);
      expect(mockSubject.setRef.mock.calls[0][1]).toBe(acl.Authorization);
      expect(mockSubject.setRef.mock.calls[1][0]).toBe(acl.accessTo);
      expect(mockSubject.setRef.mock.calls[1][1]).toBe(
        "https://some.pod/document.ttl"
      );
      expect(mockSubject.setRef.mock.calls[2][0]).toBe(acl.agent);
      expect(mockSubject.setRef.mock.calls[2][1]).toBe(
        "https://some.pod/webid.ttl"
      );
      expect(mockSubject.addRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[0][1]).toBe(acl.Read);
    });

    it("should mark the ACL config to apply to Documents within a Container as well", async () => {
      await configureAcl(
        "https://some.pod/container/",
        "https://arbitrary.pod/container/.acl",
        {
          agents: {
            "https://arbitrary.pod/webid.ttl": {
              read: true
            }
          }
        },
        { default: true }
      );

      expect(mockSubject.addRef.mock.calls[0][0]).toBe(acl.default__workaround);
      expect(mockSubject.addRef.mock.calls[0][1]).toBe(
        "https://some.pod/container/"
      );
      expect(mockSubject.addRef.mock.calls[1][0]).toBe(acl.defaultForNew);
      expect(mockSubject.addRef.mock.calls[1][1]).toBe(
        "https://some.pod/container/"
      );
    });

    it("should be able to deal with multiple configured agents", async () => {
      await configureAcl(
        "https://some.pod/document.ttl",
        "https://some.pod/document.ttl.acl",
        {
          agents: {
            "https://some.pod/webid.ttl": {
              read: true
            },
            "https://some-other.pod/other-webid.ttl": {
              append: true
            }
          }
        }
      );

      expect(mockSubject.setRef.mock.calls.length).toBe(6);
      // Agent 1:
      expect(mockSubject.setRef.mock.calls[0][0]).toBe(rdf.type);
      expect(mockSubject.setRef.mock.calls[0][1]).toBe(acl.Authorization);
      expect(mockSubject.setRef.mock.calls[1][0]).toBe(acl.accessTo);
      expect(mockSubject.setRef.mock.calls[1][1]).toBe(
        "https://some.pod/document.ttl"
      );
      expect(mockSubject.setRef.mock.calls[2][0]).toBe(acl.agent);
      expect(mockSubject.setRef.mock.calls[2][1]).toBe(
        "https://some.pod/webid.ttl"
      );
      expect(mockSubject.addRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[0][1]).toBe(acl.Read);
      // Agent 2:
      expect(mockSubject.setRef.mock.calls[3][0]).toBe(rdf.type);
      expect(mockSubject.setRef.mock.calls[3][1]).toBe(acl.Authorization);
      expect(mockSubject.setRef.mock.calls[4][0]).toBe(acl.accessTo);
      expect(mockSubject.setRef.mock.calls[4][1]).toBe(
        "https://some.pod/document.ttl"
      );
      expect(mockSubject.setRef.mock.calls[5][0]).toBe(acl.agent);
      expect(mockSubject.setRef.mock.calls[5][1]).toBe(
        "https://some-other.pod/other-webid.ttl"
      );
      expect(mockSubject.addRef.mock.calls[1][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[1][1]).toBe(acl.Append);
    });

    it("should not try to create a new ACL file if one exists", async () => {
      const mockedTripledoc = require.requireMock("tripledoc");
      mockedTripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve(mockDocument)
      );

      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          agents: {
            "https://arbitrary.pod/webid.ttl": {
              read: true
            }
          }
        }
      );

      expect(mockedTripledoc.createDocument.mock.calls.length).toBe(0);
    });

    it("should throw an error if the ACL file could not be found for some reason", async () => {
      const mockedTripledoc = require.requireMock("tripledoc");
      mockedTripledoc.createDocument.mockReturnValueOnce(undefined);

      await expect(
        configureAcl(
          "https://arbitrary.pod/document.ttl",
          "https://arbitrary.pod/document.ttl.acl",
          {
            agents: {
              "https://arbitrary.pod/webid.ttl": {
                read: true
              }
            }
          }
        )
      ).rejects.toThrowError(
        "Could not fetch the Access Control List of this Document."
      );
    });

    it("should support setting all types of modes", async () => {
      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          agents: {
            "https://arbitrary.pod/webid.ttl": {
              read: true,
              append: true,
              write: true,
              control: true
            }
          }
        }
      );

      expect(mockSubject.addRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[1][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[2][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[3][0]).toBe(acl.mode);
      const setModes = [
        mockSubject.addRef.mock.calls[0][1],
        mockSubject.addRef.mock.calls[1][1],
        mockSubject.addRef.mock.calls[2][1],
        mockSubject.addRef.mock.calls[3][1]
      ];
      expect(setModes).toContain(acl.Read);
      expect(setModes).toContain(acl.Append);
      expect(setModes).toContain(acl.Write);
      expect(setModes).toContain(acl.Control);
    });

    it("should unset modes explicitly set to false", async () => {
      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          agents: {
            "https://arbitrary.pod/webid.ttl": {
              read: false,
              append: false,
              write: false,
              control: false
            }
          }
        }
      );

      expect(mockSubject.addRef.mock.calls.length).toBe(0);
      expect(mockSubject.removeRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.removeRef.mock.calls[1][0]).toBe(acl.mode);
      expect(mockSubject.removeRef.mock.calls[2][0]).toBe(acl.mode);
      expect(mockSubject.removeRef.mock.calls[3][0]).toBe(acl.mode);
      const unsetModes = [
        mockSubject.removeRef.mock.calls[0][1],
        mockSubject.removeRef.mock.calls[1][1],
        mockSubject.removeRef.mock.calls[2][1],
        mockSubject.removeRef.mock.calls[3][1]
      ];
      expect(unsetModes).toContain(acl.Read);
      expect(unsetModes).toContain(acl.Append);
      expect(unsetModes).toContain(acl.Write);
      expect(unsetModes).toContain(acl.Control);
    });

    it("should ignore modes that were not configured", async () => {
      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          agents: {
            "https://arbitrary.pod/webid.ttl": {
              append: false
            }
          }
        }
      );

      expect(mockSubject.addRef.mock.calls.length).toBe(0);
      expect(mockSubject.removeRef.mock.calls.length).toBe(1);
      expect(mockSubject.removeRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.removeRef.mock.calls[0][1]).toBe(acl.Append);
    });

    it("should re-use existing agent-specific ACL rules if available", async () => {
      const mockExistingGetRef = (ref: Reference) => {
        if (ref === rdf.type) {
          return acl.Authorization;
        }
        if (ref === acl.agent) {
          return "https://some.pod/webid.ttl";
        }
        if (ref === acl.origin) {
          return null;
        }
        if (ref === acl.accessTo) {
          return "https://some.pod/document.ttl";
        }
      };
      const mockExistingAclRule: { [key: string]: jest.Mock } = {
        ...mockSubject,
        addRef: jest.fn(),
        getRef: jest.fn(mockExistingGetRef)
      };
      const mockedTripledoc = require.requireMock("tripledoc");
      mockedTripledoc.isSavedToPod.mockReturnValueOnce(true);
      mockedTripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve({
          ...mockDocument,
          findSubjects: () => [mockExistingAclRule]
        })
      );

      await configureAcl(
        "https://some.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          agents: {
            "https://some.pod/webid.ttl": {
              read: true
            }
          }
        }
      );

      expect(mockExistingAclRule.addRef.mock.calls.length).toBe(1);
      expect(mockExistingAclRule.addRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockExistingAclRule.addRef.mock.calls[0][1]).toBe(acl.Read);
    });

    it("should add a new Subject to an existing Document if no matching Subject was available yet", async () => {
      const mockNewAclRule = { ...mockSubject };
      const mockedTripledoc = require.requireMock("tripledoc");
      const mockExistingDocument: { [key: string]: jest.Mock } = {
        ...mockDocument,
        findSubjects: jest.fn(() => []),
        addSubject: jest.fn(() => mockNewAclRule)
      };
      mockedTripledoc.isSavedToPod.mockReturnValueOnce(true);
      mockedTripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve(mockExistingDocument)
      );

      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          agents: {
            "https://arbitrary.pod/webid.ttl": {
              read: true
            }
          }
        }
      );

      expect(mockNewAclRule.addRef.mock.calls.length).toBe(1);
      expect(mockNewAclRule.addRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockNewAclRule.addRef.mock.calls[0][1]).toBe(acl.Read);
      expect(mockExistingDocument.addSubject.mock.calls.length).toBe(1);
    });
  });

  describe("origin-specific ACL settings", () => {
    it("should be able to make a resource readable to a specific origin-agent-combination in a new ACL file", async () => {
      await configureAcl(
        "https://some.pod/document.ttl",
        "https://some.pod/document.ttl.acl",
        {
          origins: {
            "https://some.app": {
              "https://some.pod/webid.ttl": {
                read: true
              }
            }
          }
        }
      );

      expect(mockSubject.setRef.mock.calls.length).toBe(4);
      expect(mockSubject.setRef.mock.calls[0][0]).toBe(rdf.type);
      expect(mockSubject.setRef.mock.calls[0][1]).toBe(acl.Authorization);
      expect(mockSubject.setRef.mock.calls[1][0]).toBe(acl.accessTo);
      expect(mockSubject.setRef.mock.calls[1][1]).toBe(
        "https://some.pod/document.ttl"
      );
      expect(mockSubject.setRef.mock.calls[2][0]).toBe(acl.origin);
      expect(mockSubject.setRef.mock.calls[2][1]).toBe("https://some.app");
      expect(mockSubject.setRef.mock.calls[3][0]).toBe(acl.agent);
      expect(mockSubject.setRef.mock.calls[3][1]).toBe(
        "https://some.pod/webid.ttl"
      );
      expect(mockSubject.addRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[0][1]).toBe(acl.Read);
    });

    it("should mark the ACL config to apply to Documents within a Container as well", async () => {
      await configureAcl(
        "https://some.pod/container/",
        "https://arbitrary.pod/document.ttl.acl",
        {
          origins: {
            "https://arbitrary.app": {
              "https://arbitrary.pod/webid.ttl": {
                read: true
              }
            }
          }
        },
        { default: true }
      );

      expect(mockSubject.addRef.mock.calls[0][0]).toBe(acl.default__workaround);
      expect(mockSubject.addRef.mock.calls[0][1]).toBe(
        "https://some.pod/container/"
      );
      expect(mockSubject.addRef.mock.calls[1][0]).toBe(acl.defaultForNew);
      expect(mockSubject.addRef.mock.calls[1][1]).toBe(
        "https://some.pod/container/"
      );
    });

    it("should be able to deal with multiple configured origins and agents", async () => {
      await configureAcl(
        "https://some.pod/document.ttl",
        "https://some.pod/document.ttl.acl",
        {
          origins: {
            "https://some.app": {
              "https://some.pod/webid.ttl": {
                read: true
              }
            },
            "https://some-other.app": {
              "https://some-other.pod/other-webid.ttl": {
                append: true
              },
              "https://some-third.pod/third-webid.ttl": {
                control: false
              }
            }
          }
        }
      );

      expect(mockSubject.setRef.mock.calls.length).toBe(12);
      // Origin 1, agent 1:
      expect(mockSubject.setRef.mock.calls[0][0]).toBe(rdf.type);
      expect(mockSubject.setRef.mock.calls[0][1]).toBe(acl.Authorization);
      expect(mockSubject.setRef.mock.calls[1][0]).toBe(acl.accessTo);
      expect(mockSubject.setRef.mock.calls[1][1]).toBe(
        "https://some.pod/document.ttl"
      );
      expect(mockSubject.setRef.mock.calls[2][0]).toBe(acl.origin);
      expect(mockSubject.setRef.mock.calls[2][1]).toBe("https://some.app");
      expect(mockSubject.setRef.mock.calls[3][0]).toBe(acl.agent);
      expect(mockSubject.setRef.mock.calls[3][1]).toBe(
        "https://some.pod/webid.ttl"
      );
      expect(mockSubject.addRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[0][1]).toBe(acl.Read);
      // Origin 2, agent 1:
      expect(mockSubject.setRef.mock.calls[4][0]).toBe(rdf.type);
      expect(mockSubject.setRef.mock.calls[4][1]).toBe(acl.Authorization);
      expect(mockSubject.setRef.mock.calls[5][0]).toBe(acl.accessTo);
      expect(mockSubject.setRef.mock.calls[5][1]).toBe(
        "https://some.pod/document.ttl"
      );
      expect(mockSubject.setRef.mock.calls[6][0]).toBe(acl.origin);
      expect(mockSubject.setRef.mock.calls[6][1]).toBe(
        "https://some-other.app"
      );
      expect(mockSubject.setRef.mock.calls[7][0]).toBe(acl.agent);
      expect(mockSubject.setRef.mock.calls[7][1]).toBe(
        "https://some-other.pod/other-webid.ttl"
      );
      expect(mockSubject.addRef.mock.calls[1][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[1][1]).toBe(acl.Append);
      // Origin 2, agent 2:
      expect(mockSubject.setRef.mock.calls[8][0]).toBe(rdf.type);
      expect(mockSubject.setRef.mock.calls[8][1]).toBe(acl.Authorization);
      expect(mockSubject.setRef.mock.calls[9][0]).toBe(acl.accessTo);
      expect(mockSubject.setRef.mock.calls[9][1]).toBe(
        "https://some.pod/document.ttl"
      );
      expect(mockSubject.setRef.mock.calls[10][0]).toBe(acl.origin);
      expect(mockSubject.setRef.mock.calls[10][1]).toBe(
        "https://some-other.app"
      );
      expect(mockSubject.setRef.mock.calls[11][0]).toBe(acl.agent);
      expect(mockSubject.setRef.mock.calls[11][1]).toBe(
        "https://some-third.pod/third-webid.ttl"
      );
      expect(mockSubject.removeRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.removeRef.mock.calls[0][1]).toBe(acl.Control);
    });

    it("should not try to create a new ACL file if one exists", async () => {
      const mockedTripledoc = require.requireMock("tripledoc");
      mockedTripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve(mockDocument)
      );

      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          origins: {
            "https://some.app": {
              "https://arbitrary.pod/webid.ttl": {
                read: true
              }
            }
          }
        }
      );

      expect(mockedTripledoc.createDocument.mock.calls.length).toBe(0);
    });

    it("should throw an error if the ACL file could not be found for some reason", async () => {
      const mockedTripledoc = require.requireMock("tripledoc");
      mockedTripledoc.createDocument.mockReturnValueOnce(undefined);

      await expect(
        configureAcl(
          "https://arbitrary.pod/document.ttl",
          "https://arbitrary.pod/document.ttl.acl",
          {
            origins: {
              "https://some.app": {
                "https://arbitrary.pod/webid.ttl": {
                  read: true
                }
              }
            }
          }
        )
      ).rejects.toThrowError(
        "Could not fetch the Access Control List of this Document."
      );
    });

    it("should support setting all types of modes", async () => {
      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          origins: {
            "https://some.app": {
              "https://arbitrary.pod/webid.ttl": {
                read: true,
                append: true,
                write: true,
                control: true
              }
            }
          }
        }
      );

      expect(mockSubject.addRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[1][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[2][0]).toBe(acl.mode);
      expect(mockSubject.addRef.mock.calls[3][0]).toBe(acl.mode);
      const setModes = [
        mockSubject.addRef.mock.calls[0][1],
        mockSubject.addRef.mock.calls[1][1],
        mockSubject.addRef.mock.calls[2][1],
        mockSubject.addRef.mock.calls[3][1]
      ];
      expect(setModes).toContain(acl.Read);
      expect(setModes).toContain(acl.Append);
      expect(setModes).toContain(acl.Write);
      expect(setModes).toContain(acl.Control);
    });

    it("should unset modes explicitly set to false", async () => {
      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          origins: {
            "https://some.app": {
              "https://arbitrary.pod/webid.ttl": {
                read: false,
                append: false,
                write: false,
                control: false
              }
            }
          }
        }
      );

      expect(mockSubject.addRef.mock.calls.length).toBe(0);
      expect(mockSubject.removeRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.removeRef.mock.calls[1][0]).toBe(acl.mode);
      expect(mockSubject.removeRef.mock.calls[2][0]).toBe(acl.mode);
      expect(mockSubject.removeRef.mock.calls[3][0]).toBe(acl.mode);
      const unsetModes = [
        mockSubject.removeRef.mock.calls[0][1],
        mockSubject.removeRef.mock.calls[1][1],
        mockSubject.removeRef.mock.calls[2][1],
        mockSubject.removeRef.mock.calls[3][1]
      ];
      expect(unsetModes).toContain(acl.Read);
      expect(unsetModes).toContain(acl.Append);
      expect(unsetModes).toContain(acl.Write);
      expect(unsetModes).toContain(acl.Control);
    });

    it("should ignore modes that were not configured", async () => {
      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          origins: {
            "https://some.app": {
              "https://arbitrary.pod/webid.ttl": {
                append: false
              }
            }
          }
        }
      );

      expect(mockSubject.addRef.mock.calls.length).toBe(0);
      expect(mockSubject.removeRef.mock.calls.length).toBe(1);
      expect(mockSubject.removeRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockSubject.removeRef.mock.calls[0][1]).toBe(acl.Append);
    });

    it("should re-use existing agent-specific ACL rules if available", async () => {
      const mockExistingGetRef = (ref: Reference) => {
        if (ref === rdf.type) {
          return acl.Authorization;
        }
        if (ref === acl.agent) {
          return "https://some.pod/webid.ttl";
        }
        if (ref === acl.origin) {
          return "https://some.app";
        }
        if (ref === acl.accessTo) {
          return "https://some.pod/document.ttl";
        }
      };
      const mockExistingAclRule: { [key: string]: jest.Mock } = {
        ...mockSubject,
        addRef: jest.fn(),
        getRef: jest.fn(mockExistingGetRef)
      };
      const mockedTripledoc = require.requireMock("tripledoc");
      mockedTripledoc.isSavedToPod.mockReturnValueOnce(true);
      mockedTripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve({
          ...mockDocument,
          findSubjects: () => [mockExistingAclRule]
        })
      );

      await configureAcl(
        "https://some.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          origins: {
            "https://some.app": {
              "https://some.pod/webid.ttl": {
                read: true
              }
            }
          }
        }
      );

      expect(mockExistingAclRule.addRef.mock.calls.length).toBe(1);
      expect(mockExistingAclRule.addRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockExistingAclRule.addRef.mock.calls[0][1]).toBe(acl.Read);
    });

    it("should add a new Subject to an existing Document if no matching Subject was available yet", async () => {
      const mockNewAclRule = { ...mockSubject };
      const mockedTripledoc = require.requireMock("tripledoc");
      const mockExistingDocument: { [key: string]: jest.Mock } = {
        ...mockDocument,
        findSubjects: jest.fn(() => []),
        addSubject: jest.fn(() => mockNewAclRule)
      };
      mockedTripledoc.isSavedToPod.mockReturnValueOnce(true);
      mockedTripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve(mockExistingDocument)
      );

      await configureAcl(
        "https://arbitrary.pod/document.ttl",
        "https://arbitrary.pod/document.ttl.acl",
        {
          origins: {
            "https://some.app": {
              "https://arbitrary.pod/webid.ttl": {
                read: true
              }
            }
          }
        }
      );

      expect(mockNewAclRule.addRef.mock.calls.length).toBe(1);
      expect(mockNewAclRule.addRef.mock.calls[0][0]).toBe(acl.mode);
      expect(mockNewAclRule.addRef.mock.calls[0][1]).toBe(acl.Read);
      expect(mockExistingDocument.addSubject.mock.calls.length).toBe(1);
    });
  });
});
