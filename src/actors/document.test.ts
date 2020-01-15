import { describeDocument } from "../virtual/document";
import { fetchDocument } from "./document";
import { describeSubject } from "../virtual/subject";
import { Reference, createDocumentInContainer } from "tripledoc";
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
    getRef: jest
      .fn()
      .mockReturnValue("https://arbitrary-doc.com/#arbitrary-subject"),
    setRef: jest.fn(),
    getDocument: jest.fn(() => mockDocument)
  };
  mockDocument = {
    save: jest.fn().mockReturnValue(Promise.resolve(mockDocument))
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
    fetchSubject: jest.fn().mockReturnValue(Promise.resolve(mockSubject))
  };
});
jest.mock("./container.ts", () => {
  initialiseMocks();
  return {
    fetchContainer: jest
      .fn()
      .mockReturnValue(Promise.resolve("https://arbitrary.pod/container/"))
  };
});

describe("fetchDocument", () => {
  it("should pass on a direct reference to Tripledoc", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualDocument = describeDocument().isFoundAt(
      "https://arbitrary.doc/resource.ttl"
    );

    fetchDocument(virtualDocument);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
    expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
      "https://arbitrary.doc/resource.ttl"
    );
  });

  it("should re-use cached responses", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualDocument = describeDocument().isFoundAt(
      "https://arbitrary.doc/resource.ttl"
    );

    fetchDocument(virtualDocument);
    fetchDocument(virtualDocument);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
  });

  it("should re-use in-progress requests", () => {
    const tripledoc = jest.requireMock("tripledoc");
    tripledoc.fetchDocument.mockReturnValueOnce(new Promise(() => undefined));
    const virtualDocument = describeDocument().isFoundAt(
      "https://arbitrary.doc/resource.ttl"
    );

    fetchDocument(virtualDocument);
    fetchDocument(virtualDocument);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
  });

  it("should not share caches over different virtual Documents", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualDocument1 = describeDocument().isFoundAt(
      "https://arbitrary.doc/resource.ttl"
    );
    const virtualDocument2 = describeDocument().isFoundAt(
      "https://arbitrary.doc/resource.ttl"
    );

    fetchDocument(virtualDocument1);
    fetchDocument(virtualDocument2);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(2);
    expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
      "https://arbitrary.doc/resource.ttl"
    );
    expect(tripledoc.fetchDocument.mock.calls[1][0]).toBe(
      "https://arbitrary.doc/resource.ttl"
    );
  });

  describe("that is an ACL for another Document", () => {
    it("should fetch it if available", async () => {
      const tripledoc = jest.requireMock("tripledoc");
      const sourceDocument = describeDocument().isFoundAt(
        "https://arbitrary.doc/resource.ttl"
      );
      const aclDocument = describeDocument().isAclFor(sourceDocument);
      tripledoc.fetchDocument.mockReturnValueOnce({
        getAclRef: () => "https://arbitrary.doc/resource.ttl.acl"
      });
      tripledoc.fetchDocument.mockReturnValueOnce("Mocked ACL Document");

      const aclDoc = await fetchDocument(aclDocument);

      expect(aclDoc).toEqual("Mocked ACL Document");
      expect(tripledoc.fetchDocument.mock.calls.length).toBe(2);
      expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
        "https://arbitrary.doc/resource.ttl"
      );
      expect(tripledoc.fetchDocument.mock.calls[1][0]).toBe(
        "https://arbitrary.doc/resource.ttl.acl"
      );
    });

    it("should return null if the source Document does not exist", async () => {
      const tripledoc = jest.requireMock("tripledoc");
      const sourceDocument = describeDocument().isFoundAt(
        "https://arbitrary.doc/resource.ttl"
      );
      const aclDocument = describeDocument().isAclFor(sourceDocument);
      tripledoc.fetchDocument.mockReturnValueOnce(null);

      const aclDoc = await fetchDocument(aclDocument);

      expect(aclDoc).toBeNull();
    });

    it("should return null if the source Document does not refer to an ACL file", async () => {
      const tripledoc = jest.requireMock("tripledoc");
      const sourceDocument = describeDocument().isFoundAt(
        "https://arbitrary.doc/resource.ttl"
      );
      const aclDocument = describeDocument().isAclFor(sourceDocument);
      tripledoc.fetchDocument.mockReturnValueOnce({ getAclRef: () => null });

      const aclDoc = await fetchDocument(aclDocument);

      expect(aclDoc).toBeNull();
    });
  });

  describe("found on a Subject", () => {
    it("should fetch it if available", async () => {
      const tripledoc = jest.requireMock("tripledoc");
      tripledoc.fetchDocument.mockReturnValueOnce(
        "The Document we are looking for"
      );
      mockSubject.getRef.mockReturnValueOnce("https://some.doc/resource.ttl");

      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualDocument = describeDocument().isFoundOn(
        sourceSubject,
        "https://mock-vocab.example/#some-predicate"
      );

      const retrievedDocument = await fetchDocument(virtualDocument);

      expect(retrievedDocument).toBe("The Document we are looking for");
      expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
      expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
        "https://some.doc/resource.ttl"
      );
    });

    it("should return null if the source Subject could not be found", async () => {
      const mockVirtualSubject = jest.requireMock("./subject.ts");
      mockVirtualSubject.fetchSubject.mockReturnValueOnce(
        Promise.resolve(null)
      );

      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualDocument = describeDocument().isFoundOn(
        sourceSubject,
        "https://mock-vocab.example/#arbitrary-predicate"
      );

      const retrievedDocument = await fetchDocument(virtualDocument);

      expect(retrievedDocument).toBeNull();
    });

    it("should return null if the source Subject does not refer to a Document for the given Predicate", async () => {
      mockSubject.getRef.mockReturnValueOnce(null);

      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualDocument = describeDocument().isFoundOn(
        sourceSubject,
        "https://mock-vocab.example/#arbitrary-predicate"
      );

      const retrievedDocument = await fetchDocument(virtualDocument);

      expect(retrievedDocument).toBeNull();
    });
  });

  describe("ensured on a Subject", () => {
    it("should fetch it if available", async () => {
      const tripledoc = jest.requireMock("tripledoc");
      tripledoc.fetchDocument.mockReturnValueOnce(
        "The Document we are looking for"
      );
      mockSubject.getRef.mockReturnValueOnce("https://some.doc/resource.ttl");

      const fallbackContainer = describeContainer().isFoundAt(
        "https://arbitrary.pod"
      );
      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualDocument = describeDocument().isEnsuredOn(
        sourceSubject,
        "https://mock-vocab.example/#some-predicate",
        fallbackContainer
      );

      const retrievedDocument = await fetchDocument(virtualDocument);

      expect(retrievedDocument).toBe("The Document we are looking for");
      expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
      expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
        "https://some.doc/resource.ttl"
      );
    });

    it("should return null if the Container the Document is to be created in could not be found", async () => {
      const mockVirtualContainer = jest.requireMock("./container.ts");
      mockVirtualContainer.fetchContainer.mockReturnValueOnce(null);
      mockSubject.getRef.mockReturnValueOnce(null);

      const fallbackContainer = describeContainer().isFoundAt(
        "https://arbitrary.pod"
      );
      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualDocument = describeDocument().isEnsuredOn(
        sourceSubject,
        "https://mock-vocab.example/#arbitrary-predicate",
        fallbackContainer
      );

      const retrievedDocument = await fetchDocument(virtualDocument);

      expect(retrievedDocument).toBeNull();
    });

    it("should return null if the source Subject could not be found", async () => {
      const mockVirtualSubject = jest.requireMock("./subject.ts");
      mockVirtualSubject.fetchSubject.mockReturnValueOnce(
        Promise.resolve(null)
      );

      const fallbackContainer = describeContainer().isFoundAt(
        "https://arbitrary.pod"
      );
      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualDocument = describeDocument().isEnsuredOn(
        sourceSubject,
        "https://mock-vocab.example/#arbitrary-predicate",
        fallbackContainer
      );

      const retrievedDocument = await fetchDocument(virtualDocument);

      expect(retrievedDocument).toBeNull();
    });

    it("should create the Document if the source Subject does not yet refer to a Document for the given Predicate", async () => {
      const tripledoc = require.requireMock("tripledoc");
      const mockNewDocument: any = {
        ...mockDocument,
        asRef: jest.fn(() => "https://some.doc/resource.ttl"),
        save: jest.fn(() => Promise.resolve(mockNewDocument))
      };
      tripledoc.createDocumentInContainer.mockReturnValueOnce(mockNewDocument);
      const mockVirtualContainer = jest.requireMock("./container.ts");
      mockVirtualContainer.fetchContainer.mockReturnValueOnce(
        Promise.resolve("https://some.pod/container/")
      );
      mockSubject.getRef.mockReturnValueOnce(null);

      const fallbackContainer = describeContainer().isFoundAt(
        "https://some.pod/container/"
      );
      const sourceSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualDocument = describeDocument().isEnsuredOn(
        sourceSubject,
        "https://mock-vocab.example/#some-predicate",
        fallbackContainer
      );

      const retrievedDocument = await fetchDocument(virtualDocument);

      expect(retrievedDocument).toEqual(mockNewDocument);
      expect(tripledoc.createDocumentInContainer.mock.calls.length).toBe(1);
      expect(tripledoc.createDocumentInContainer.mock.calls[0][0]).toBe(
        "https://some.pod/container/"
      );
      expect(mockSubject.setRef.mock.calls.length).toBe(1);
      expect(mockSubject.setRef.mock.calls[0][0]).toBe(
        "https://mock-vocab.example/#some-predicate"
      );
      expect(mockSubject.setRef.mock.calls[0][1]).toBe(
        "https://some.doc/resource.ttl"
      );
    });
  });
});
