import { internal_fetchContainer } from "./container";
import { describeContainer } from "../virtual/container";
import { describeSubject } from "../virtual/subject";

let mockSubject: { [key: string]: jest.Mock };
let mockContainerDocument: { [key: string]: jest.Mock };
function initialiseMocks() {
  // `jest.mock` is run first by Jest, so any initialisation of mock globals should be done in there.
  // Thus, this function is called in there. However, we only want to initialise the mocks once so
  // as not to override their values.
  if (typeof mockSubject !== "undefined") {
    return;
  }

  mockSubject = {
    getRef: jest.fn(() => "https://arbitrary.pod/container/")
  };
  mockContainerDocument = {
    getAclRef: jest.fn(() => "https://arbitrary.pod/container/.acl")
  };
}
jest.mock("solid-auth-client");
jest.mock("tripledoc", () => {
  initialiseMocks();
  return {
    fetchDocument: jest.fn(() => Promise.resolve(mockContainerDocument)),
    createDocument: jest.fn(() => ({ save: () => Promise.resolve() }))
  };
});
jest.mock("./subject.ts", () => {
  initialiseMocks();
  return {
    internal_fetchSubject: jest.fn(() => Promise.resolve(mockSubject))
  };
});
jest.mock("../services/acl.ts", () => {
  initialiseMocks();
  return {
    ...require.requireActual("../services/acl.ts"),
    configureAcl: jest.fn()
  };
});

describe("fetchContainer", () => {
  it("should directly return direct references", async () => {
    const virtualContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const container = await internal_fetchContainer(virtualContainer);

    expect(container).toBe("https://arbitrary.pod/container/");
  });

  it("should re-use cached responses", () => {
    const mockedVirtualSubject = require.requireMock("./subject.ts");
    const sourceSubject = describeSubject().isFoundAt(
      "https://arbitrary.pod/document.ttl#subject"
    );
    const virtualContainer = describeContainer().isFoundOn(
      sourceSubject,
      "https://arbitrary.vocab/#arbitrary-predicate"
    );

    internal_fetchContainer(virtualContainer);
    internal_fetchContainer(virtualContainer);

    expect(mockedVirtualSubject.internal_fetchSubject.mock.calls.length).toBe(
      1
    );
  });

  it("should re-use in-progress requests", () => {
    const mockedVirtualSubject = require.requireMock("./subject.ts");
    mockedVirtualSubject.internal_fetchSubject.mockReturnValueOnce(
      new Promise(() => undefined)
    );
    const sourceSubject = describeSubject().isFoundAt(
      "https://arbitrary.pod/document.ttl#subject"
    );
    const virtualContainer = describeContainer().isFoundOn(
      sourceSubject,
      "https://arbitrary.vocab/#arbitrary-predicate"
    );

    internal_fetchContainer(virtualContainer);
    internal_fetchContainer(virtualContainer);

    expect(mockedVirtualSubject.internal_fetchSubject.mock.calls.length).toBe(
      1
    );
  });

  it("should not share caches over different virtual Documents", () => {
    const mockedVirtualSubject = require.requireMock("./subject.ts");
    const sourceSubject1 = describeSubject().isFoundAt(
      "https://some.pod/document.ttl#subject1"
    );
    const virtualContainer1 = describeContainer().isFoundOn(
      sourceSubject1,
      "https://arbitrary.vocab/#arbitrary-predicate"
    );
    const sourceSubject2 = describeSubject().isFoundAt(
      "https://some.pod/document.ttl#subject2"
    );
    const virtualContainer2 = describeContainer().isFoundOn(
      sourceSubject2,
      "https://arbitrary.vocab/#arbitrary-other-predicate"
    );

    internal_fetchContainer(virtualContainer1);
    internal_fetchContainer(virtualContainer2);

    expect(mockedVirtualSubject.internal_fetchSubject.mock.calls.length).toBe(
      2
    );
    expect(mockedVirtualSubject.internal_fetchSubject.mock.calls[0][0]).toEqual(
      sourceSubject1
    );
    expect(mockedVirtualSubject.internal_fetchSubject.mock.calls[1][0]).toEqual(
      sourceSubject2
    );
  });

  it("should error when the type of Virtual Container is unsupported", async () => {
    const virtualContainer = {
      internal_descriptor: {
        type: "Some unsupported type of Virtual Container"
      }
    };

    await expect(
      internal_fetchContainer(virtualContainer as any)
    ).rejects.toThrowError(
      "This type of Virtual Container can not be processed yet."
    );
  });

  describe("found on a Subject", () => {
    it("should return it if set", async () => {
      mockSubject.getRef.mockReturnValueOnce(
        "https://arbitrary.pod/container/"
      );

      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualContainer = describeContainer().isFoundOn(
        sourceSubject,
        "https://mock-vocab.example/#some-predicate"
      );

      const retrievedContainer = await internal_fetchContainer(
        virtualContainer
      );

      expect(retrievedContainer).toBe("https://arbitrary.pod/container/");
      expect(mockSubject.getRef.mock.calls.length).toBe(1);
      expect(mockSubject.getRef.mock.calls[0][0]).toBe(
        "https://mock-vocab.example/#some-predicate"
      );
    });

    it("should return null if the source Subject could not be found", async () => {
      const mockVirtualSubject = jest.requireMock("./subject.ts");
      mockVirtualSubject.internal_fetchSubject.mockReturnValueOnce(
        Promise.resolve(null)
      );

      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualContainer = describeContainer().isFoundOn(
        sourceSubject,
        "https://mock-vocab.example/#arbitrary-predicate"
      );

      const retrievedContainer = await internal_fetchContainer(
        virtualContainer
      );

      expect(retrievedContainer).toBeNull();
    });

    it("should return null if the source Subject does not refer to a Container for the given Predicate", async () => {
      mockSubject.getRef.mockReturnValueOnce(null);

      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualContainer = describeContainer().isFoundOn(
        sourceSubject,
        "https://mock-vocab.example/#arbitrary-predicate"
      );

      const retrievedContainer = await internal_fetchContainer(
        virtualContainer
      );

      expect(retrievedContainer).toBeNull();
    });
  });

  describe("ensured on a Subject", () => {
    it("should return it if set", async () => {
      const tripledoc = require.requireMock("tripledoc");
      tripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve("Arbitrary return value that does not throw.")
      );

      const parentContainer = describeContainer().isFoundAt(
        "https://some.pod/container/"
      );
      const virtualContainer = describeContainer().isContainedIn(
        parentContainer,
        "sub-container"
      );

      const retrievedContainer = await internal_fetchContainer(
        virtualContainer
      );

      expect(retrievedContainer).toBe(
        "https://some.pod/container/sub-container/"
      );
      expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
      expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
        "https://some.pod/container/sub-container/"
      );
    });

    it("should correctly determine its IRI even if the parent Container did not include a trailing slash", async () => {
      const tripledoc = require.requireMock("tripledoc");
      tripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve("Arbitrary return value that does not throw.")
      );

      const parentContainer = describeContainer().isFoundAt(
        "https://some.pod/container"
      );
      const virtualContainer = describeContainer().isContainedIn(
        parentContainer,
        "sub-container"
      );

      const retrievedContainer = await internal_fetchContainer(
        virtualContainer
      );

      expect(retrievedContainer).toBe(
        "https://some.pod/container/sub-container/"
      );
    });

    it("should correctly determine its IRI even if its name has a trailing slash", async () => {
      const tripledoc = require.requireMock("tripledoc");
      tripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve("Arbitrary return value that does not throw.")
      );

      const parentContainer = describeContainer().isFoundAt(
        "https://some.pod/container"
      );
      const virtualContainer = describeContainer().isContainedIn(
        parentContainer,
        "sub-container/"
      );

      const retrievedContainer = await internal_fetchContainer(
        virtualContainer
      );

      expect(retrievedContainer).toBe(
        "https://some.pod/container/sub-container/"
      );
    });

    it("should correctly determine its IRI even if its name has a leading slash", async () => {
      const tripledoc = require.requireMock("tripledoc");
      tripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve("Arbitrary return value that does not throw.")
      );

      const parentContainer = describeContainer().isFoundAt(
        "https://some.pod/container"
      );
      const virtualContainer = describeContainer().isContainedIn(
        parentContainer,
        "/sub-container"
      );

      const retrievedContainer = await internal_fetchContainer(
        virtualContainer
      );

      expect(retrievedContainer).toBe(
        "https://some.pod/container/sub-container/"
      );
    });

    it("should return null if the parent Container could not be found", async () => {
      const mockInvalidParentContainer = describeContainer().isFoundAt(
        "Ref that will be removed again."
      );
      // This should not be produced using describeContainer(), but it tricks it into return a
      // non-existing Container:
      mockInvalidParentContainer.internal_descriptor.reference = null as any;

      const virtualContainer = describeContainer().isContainedIn(
        mockInvalidParentContainer as any,
        "sub-container"
      );

      const retrievedContainer = await internal_fetchContainer(
        virtualContainer
      );

      expect(retrievedContainer).toBeNull();
    });

    it("should create a new Container if it does not exist yet, by using the workaround of creating a dummy file in the Container and deleting it afterwards", async () => {
      const SolidAuthClient = require.requireMock("solid-auth-client");
      const tripledoc = require.requireMock("tripledoc");
      tripledoc.fetchDocument.mockReturnValueOnce(
        Promise.reject(
          "Arbitrary rejection that simulates that the Container does not exist yet"
        )
      );

      const parentContainer = describeContainer().isFoundAt(
        "https://some.pod/container/"
      );
      const virtualContainer = describeContainer().isContainedIn(
        parentContainer,
        "sub-container"
      );

      const retrievedContainer = await internal_fetchContainer(
        virtualContainer
      );

      expect(retrievedContainer).toBe(
        "https://some.pod/container/sub-container/"
      );
      expect(tripledoc.createDocument.mock.calls.length).toBe(1);
      expect(tripledoc.createDocument.mock.calls[0][0]).toBe(
        "https://some.pod/container/sub-container/.dummy"
      );
      expect(SolidAuthClient.fetch.mock.calls.length).toBe(1);
      expect(SolidAuthClient.fetch.mock.calls[0][0]).toBe(
        "https://some.pod/container/sub-container/.dummy"
      );
      expect(SolidAuthClient.fetch.mock.calls[0][1]).toEqual({
        method: "DELETE"
      });
    });

    it("should configure the ACL of a new Container if requested to do so", async () => {
      const aclService = jest.requireMock("../services/acl.ts");
      const tripledoc = require.requireMock("tripledoc");
      tripledoc.fetchDocument.mockReturnValueOnce(
        Promise.reject(
          "Arbitrary rejection that simulates that the Container does not exist yet"
        )
      );
      // The second time the Container is fetched is after it has been created:
      tripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve({
          getAclRef: () => "https://arbitrary.pod/container/.acl"
        })
      );

      const parentContainer = describeContainer().isFoundAt(
        "https://arbitrary.pod/container/"
      );
      const virtualContainer = describeContainer()
        .isContainedIn(parentContainer, "sub-container")
        .experimental_isReadableByEveryone();

      await internal_fetchContainer(virtualContainer);

      expect(aclService.configureAcl.mock.calls.length).toBe(1);
    });

    it("should set up the ACL to apply to all its children as well", async () => {
      const aclService = jest.requireMock("../services/acl.ts");
      const tripledoc = require.requireMock("tripledoc");
      tripledoc.fetchDocument.mockReturnValueOnce(
        Promise.reject(
          "Arbitrary rejection that simulates that the Container does not exist yet"
        )
      );
      // The second time the Container is fetched is after it has been created:
      tripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve({
          getAclRef: () => "https://arbitrary.pod/container/.acl"
        })
      );

      const parentContainer = describeContainer().isFoundAt(
        "https://arbitrary.pod/container/"
      );
      const virtualContainer = describeContainer()
        .isContainedIn(parentContainer, "sub-container")
        .experimental_isReadableByEveryone();

      await internal_fetchContainer(virtualContainer);

      expect(aclService.configureAcl.mock.calls[0][3]).toEqual({
        default: true
      });
    });

    it("should throw an error if the ACL needs to be configured but no ACL file was referenced", async () => {
      const tripledoc = require.requireMock("tripledoc");
      tripledoc.fetchDocument.mockReturnValueOnce(
        Promise.reject(
          "Arbitrary rejection that simulates that the Container does not exist yet"
        )
      );
      // The second time the Container is fetched is after it has been created:
      tripledoc.fetchDocument.mockReturnValueOnce(
        Promise.resolve({ getAclRef: () => null })
      );

      const parentContainer = describeContainer().isFoundAt(
        "https://arbitrary.pod/container/"
      );
      const virtualContainer = describeContainer()
        .isContainedIn(parentContainer, "sub-container")
        .experimental_isReadableByEveryone();

      await expect(
        internal_fetchContainer(virtualContainer)
      ).rejects.toThrowError(
        "Could not find a location for the Access Control List of this Container."
      );
    });

    it("should not configure the ACL of a new Container if not requested to do so", async () => {
      const aclService = jest.requireMock("../services/acl.ts");
      const tripledoc = require.requireMock("tripledoc");
      tripledoc.fetchDocument.mockReturnValueOnce(
        Promise.reject(
          "Arbitrary rejection that simulates that the Container does not exist yet"
        )
      );

      const parentContainer = describeContainer().isFoundAt(
        "https://arbitrary.pod/container/"
      );
      const virtualContainer = describeContainer().isContainedIn(
        parentContainer,
        "sub-container"
      );

      await internal_fetchContainer(virtualContainer);

      expect(aclService.configureAcl.mock.calls.length).toBe(0);
    });
  });
});
