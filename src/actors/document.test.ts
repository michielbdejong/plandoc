import { describeDocument } from "../virtual/document";
import { fetchDocument } from "./document";
import { describeSubject } from "../virtual/subject";
import { describeContainer } from "../virtual/container";

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
    getRef: jest.fn(() => "https://arbitrary.pod/document.ttl#subject"),
    setRef: jest.fn(),
    getDocument: jest.fn(() => mockDocument)
  };
  mockDocument = {
    save: jest.fn(() => Promise.resolve(mockDocument)),
    asRef: jest.fn().mockReturnValue("https://arbitrary.pod/document.ttl"),
    getAclRef: jest.fn(() => "https://arbitrary.pod/document.ttl.acl")
  };
}
jest.mock("tripledoc", () => {
  initialiseMocks();
  return {
    fetchDocument: jest.fn().mockReturnValue(Promise.resolve(mockDocument)),
    createDocumentInContainer: jest.fn().mockReturnValue(mockDocument)
  };
});
jest.mock("./subject.ts", () => {
  initialiseMocks();
  return {
    internal_fetchSubject: jest.fn(() => Promise.resolve(mockSubject))
  };
});
jest.mock("./container.ts", () => {
  initialiseMocks();
  return {
    internal_fetchContainer: jest
      .fn()
      .mockReturnValue(Promise.resolve("https://arbitrary.pod/container/"))
  };
});
jest.mock("../services/acl.ts", () => {
  initialiseMocks();
  return {
    ...require.requireActual("../services/acl.ts"),
    configureAcl: jest.fn()
  };
});

describe("fetchDocument", () => {
  it("should pass on a direct reference to Tripledoc", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualDocument = describeDocument().isFoundAt(
      "https://some.pod/document.ttl"
    );

    fetchDocument(virtualDocument);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
    expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
      "https://some.pod/document.ttl"
    );
  });

  it("should re-use cached responses", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualDocument = describeDocument().isFoundAt(
      "https://arbitrary.pod/document.ttl"
    );

    fetchDocument(virtualDocument);
    fetchDocument(virtualDocument);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
  });

  it("should re-use in-progress requests", () => {
    const tripledoc = jest.requireMock("tripledoc");
    tripledoc.fetchDocument.mockReturnValueOnce(new Promise(() => undefined));
    const virtualDocument = describeDocument().isFoundAt(
      "https://arbitrary.pod/document.ttl"
    );

    fetchDocument(virtualDocument);
    fetchDocument(virtualDocument);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
  });

  it("should update the cache after saving a Document", async () => {
    mockDocument.save.mockReturnValueOnce(
      Promise.resolve("Mock saved Document")
    );
    const virtualDocument = describeDocument().isFoundAt(
      "https://arbitrary.pod/document.ttl"
    );

    const document = await fetchDocument(virtualDocument);
    await document?.save();
    const documentFromCache = await fetchDocument(virtualDocument);

    expect(documentFromCache).toBe("Mock saved Document");
  });

  it("should not share caches over different virtual Documents", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualDocument1 = describeDocument().isFoundAt(
      "https://some.pod/document.ttl"
    );
    const virtualDocument2 = describeDocument().isFoundAt(
      "https://some.pod/document.ttl"
    );

    fetchDocument(virtualDocument1);
    fetchDocument(virtualDocument2);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(2);
    expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
      "https://some.pod/document.ttl"
    );
    expect(tripledoc.fetchDocument.mock.calls[1][0]).toBe(
      "https://some.pod/document.ttl"
    );
  });

  it("should error when the type of Virtual Document is unsupported", async () => {
    const virtualDocument = {
      internal_descriptor: { type: "Some unsupported type of Virtual Document" }
    };

    await expect(fetchDocument(virtualDocument as any)).rejects.toThrowError(
      "This type of Virtual Document can not be processed yet."
    );
  });

  describe("that is an ACL for another Document", () => {
    it("should fetch it if available", async () => {
      const tripledoc = jest.requireMock("tripledoc");
      const sourceDocument = describeDocument().isFoundAt(
        "https://some.pod/document.ttl"
      );
      const aclDocument = describeDocument().experimental_isAclFor(
        sourceDocument
      );
      tripledoc.fetchDocument.mockReturnValueOnce({
        getAclRef: () => "https://some.pod/document.ttl.acl"
      });
      const mockAclDoc = {
        ...mockDocument,
        asRef: () => "Some Ref that identifies the mock ACL doc"
      };
      tripledoc.fetchDocument.mockReturnValueOnce(mockAclDoc);

      const aclDoc = await fetchDocument(aclDocument);

      expect(aclDoc?.asRef()).toBe("Some Ref that identifies the mock ACL doc");
      expect(tripledoc.fetchDocument.mock.calls.length).toBe(2);
      expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
        "https://some.pod/document.ttl"
      );
      expect(tripledoc.fetchDocument.mock.calls[1][0]).toBe(
        "https://some.pod/document.ttl.acl"
      );
    });

    it("should return null if the source Document does not exist", async () => {
      const tripledoc = jest.requireMock("tripledoc");
      const sourceDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const aclDocument = describeDocument().experimental_isAclFor(
        sourceDocument
      );
      tripledoc.fetchDocument.mockReturnValueOnce(null);

      const aclDoc = await fetchDocument(aclDocument);

      expect(aclDoc).toBeNull();
    });

    it("should return null if the source Document does not refer to an ACL file", async () => {
      const tripledoc = jest.requireMock("tripledoc");
      const sourceDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const aclDocument = describeDocument().experimental_isAclFor(
        sourceDocument
      );
      tripledoc.fetchDocument.mockReturnValueOnce({ getAclRef: () => null });

      const aclDoc = await fetchDocument(aclDocument);

      expect(aclDoc).toBeNull();
    });
  });

  describe("found on a Subject", () => {
    it("should fetch it if available", async () => {
      const tripledoc = jest.requireMock("tripledoc");
      tripledoc.fetchDocument.mockReturnValueOnce({
        ...mockDocument,
        asRef: () => "Some Ref identifying the Document we are looking for"
      });
      mockSubject.getRef.mockReturnValueOnce("https://some.pod/document.ttl");

      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualDocument = describeDocument().isFoundOn(
        sourceSubject,
        "https://arbitrary.vocab/#predicate"
      );

      const retrievedDocument = await fetchDocument(virtualDocument);

      expect(retrievedDocument?.asRef()).toBe(
        "Some Ref identifying the Document we are looking for"
      );
      expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
      expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
        "https://some.pod/document.ttl"
      );
    });

    it("should return null if the source Subject could not be found", async () => {
      const mockVirtualSubject = jest.requireMock("./subject.ts");
      mockVirtualSubject.internal_fetchSubject.mockReturnValueOnce(
        Promise.resolve(null)
      );

      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualDocument = describeDocument().isFoundOn(
        sourceSubject,
        "https://arbitrary.vocab/#predicate"
      );

      const retrievedDocument = await fetchDocument(virtualDocument);

      expect(retrievedDocument).toBeNull();
    });

    it("should return null if the source Subject does not refer to a Document for the given Predicate", async () => {
      mockSubject.getRef.mockReturnValueOnce(null);

      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualDocument = describeDocument().isFoundOn(
        sourceSubject,
        "https://arbitrary.vocab/#predicate"
      );

      const retrievedDocument = await fetchDocument(virtualDocument);

      expect(retrievedDocument).toBeNull();
    });
  });

  describe("ensured on a Subject", () => {
    it("should fetch it if available", async () => {
      const tripledoc = jest.requireMock("tripledoc");
      tripledoc.fetchDocument.mockReturnValueOnce({
        ...mockDocument,
        asRef: () => "Some Ref identifying the Document we are looking for"
      });
      mockSubject.getRef.mockReturnValueOnce("https://some.pod/document.ttl");

      const fallbackContainer = describeContainer().experimental_isFoundAt(
        "https://arbitrary.pod/container/"
      );
      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualDocument = describeDocument().isEnsuredOn(
        sourceSubject,
        "https://arbitrary.vocab/#predicate",
        fallbackContainer
      );

      const retrievedDocument = await fetchDocument(virtualDocument);

      expect(retrievedDocument?.asRef()).toBe(
        "Some Ref identifying the Document we are looking for"
      );
      expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
      expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
        "https://some.pod/document.ttl"
      );
    });

    it("should return null if the Container the Document is to be created in could not be found", async () => {
      const mockVirtualContainer = jest.requireMock("./container.ts");
      mockVirtualContainer.internal_fetchContainer.mockReturnValueOnce(null);
      mockSubject.getRef.mockReturnValueOnce(null);

      const fallbackContainer = describeContainer().experimental_isFoundAt(
        "https://arbitrary.pod/container/"
      );
      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualDocument = describeDocument().isEnsuredOn(
        sourceSubject,
        "https://arbitrary.vocab/#predicate",
        fallbackContainer
      );

      const retrievedDocument = await fetchDocument(virtualDocument);

      expect(retrievedDocument).toBeNull();
    });

    it("should return null if the source Subject could not be found", async () => {
      const mockVirtualSubject = jest.requireMock("./subject.ts");
      mockVirtualSubject.internal_fetchSubject.mockReturnValueOnce(
        Promise.resolve(null)
      );

      const fallbackContainer = describeContainer().experimental_isFoundAt(
        "https://arbitrary.pod/container/"
      );
      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualDocument = describeDocument().isEnsuredOn(
        sourceSubject,
        "https://arbitrary.vocab/#predicate",
        fallbackContainer
      );

      const retrievedDocument = await fetchDocument(virtualDocument);

      expect(retrievedDocument).toBeNull();
    });

    it("should create the Document if the source Subject does not yet refer to a Document for the given Predicate", async () => {
      const tripledoc = require.requireMock("tripledoc");
      const mockNewDocument: any = {
        ...mockDocument,
        asRef: jest.fn(() => "https://some.pod/document.ttl"),
        save: jest.fn(() => Promise.resolve(mockNewDocument))
      };
      tripledoc.createDocumentInContainer.mockReturnValueOnce(mockNewDocument);
      const mockVirtualContainer = jest.requireMock("./container.ts");
      mockVirtualContainer.internal_fetchContainer.mockReturnValueOnce(
        Promise.resolve("https://some.pod/container/")
      );
      mockSubject.getRef.mockReturnValueOnce(null);

      const fallbackContainer = describeContainer().experimental_isFoundAt(
        "https://some.pod/container/"
      );
      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualDocument = describeDocument().isEnsuredOn(
        sourceSubject,
        "https://arbitrary.vocab/#predicate",
        fallbackContainer
      );

      const retrievedDocument = await fetchDocument(virtualDocument);

      expect(retrievedDocument?.asRef()).toEqual(
        "https://some.pod/document.ttl"
      );
      expect(tripledoc.createDocumentInContainer.mock.calls.length).toBe(1);
      expect(tripledoc.createDocumentInContainer.mock.calls[0][0]).toBe(
        "https://some.pod/container/"
      );
      expect(mockSubject.setRef.mock.calls.length).toBe(1);
      expect(mockSubject.setRef.mock.calls[0][0]).toBe(
        "https://arbitrary.vocab/#predicate"
      );
      expect(mockSubject.setRef.mock.calls[0][1]).toBe(
        "https://some.pod/document.ttl"
      );
    });

    it("should configure its ACL if requested to do so", async () => {
      const aclService = jest.requireMock("../services/acl.ts");
      mockSubject.getRef.mockReturnValueOnce(null);

      const fallbackContainer = describeContainer().experimental_isFoundAt(
        "https://arbitrary.pod/container/"
      );
      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualDocument = describeDocument()
        .isEnsuredOn(
          sourceSubject,
          "https://arbitrary.vocab/#predicate",
          fallbackContainer
        )
        .experimental_isReadableByEveryone();

      await fetchDocument(virtualDocument);

      expect(aclService.configureAcl.mock.calls.length).toBe(1);
    });

    it("should throw an error if the ACL needs to be configured but no ACL file was referenced", async () => {
      mockSubject.getRef.mockReturnValueOnce(null);
      mockDocument.getAclRef.mockReturnValueOnce(null);

      const fallbackContainer = describeContainer().experimental_isFoundAt(
        "https://arbitrary.pod/container/"
      );
      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualDocument = describeDocument()
        .isEnsuredOn(
          sourceSubject,
          "https://arbitrary.vocab/#predicate",
          fallbackContainer
        )
        .experimental_isReadableByEveryone();

      await expect(fetchDocument(virtualDocument)).rejects.toThrowError(
        "Could not find a location for the Access Control List of this Document."
      );
    });

    it("should not configure its ACL if not requested to do so", async () => {
      const aclService = jest.requireMock("../services/acl.ts");
      mockSubject.getRef.mockReturnValueOnce(null);

      const fallbackContainer = describeContainer().experimental_isFoundAt(
        "https://arbitrary.pod/container/"
      );
      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualDocument = describeDocument().isEnsuredOn(
        sourceSubject,
        "https://arbitrary.vocab/#predicate",
        fallbackContainer
      );

      await fetchDocument(virtualDocument);

      expect(aclService.configureAcl.mock.calls.length).toBe(0);
    });
  });
});
