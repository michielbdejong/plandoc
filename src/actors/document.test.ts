import { describeDocument } from "../virtual/document";
import { fetchDocument } from "./document";
import { describeSubject } from "../virtual/subject";
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
    getRef: jest
      .fn()
      .mockReturnValue("https://arbitrary-doc.com/#arbitrary-subject")
  };
  mockDocument = {};
}
jest.mock("tripledoc", () => {
  initialiseMocks();
  return {
    fetchDocument: jest.fn().mockReturnValue(Promise.resolve(mockDocument))
  };
});
jest.mock("./subject.ts", () => {
  initialiseMocks();
  return {
    fetchSubject: jest.fn().mockReturnValue(Promise.resolve(mockSubject))
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
});
