import { describeDocument } from "../virtual/document";
import { fetchDocument } from "./document";

jest.mock("tripledoc", () => ({
  fetchDocument: jest.fn().mockReturnValue(Promise.resolve())
}));

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
});
