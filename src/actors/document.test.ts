import { locateDocByRef, ensureDocForRef } from "../virtual/document";
import { fetchDocument } from "./document";
import { selectSubjectFromRef } from "../virtual/subject";

jest.mock("tripledoc", () => ({
  fetchDocument: jest.fn().mockReturnValue(Promise.resolve())
}));

describe("fetchDocument", () => {
  it("should pass on a direct reference to Tripledoc", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualDocument = locateDocByRef(
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
    const virtualDocument = locateDocByRef(
      "https://arbitrary.doc/resource.ttl"
    );

    fetchDocument(virtualDocument);
    fetchDocument(virtualDocument);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
  });

  it("should re-use in-progress requests", () => {
    const tripledoc = jest.requireMock("tripledoc");
    tripledoc.fetchDocument.mockReturnValueOnce(new Promise(() => undefined));
    const virtualDocument = locateDocByRef(
      "https://arbitrary.doc/resource.ttl"
    );

    fetchDocument(virtualDocument);
    fetchDocument(virtualDocument);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
  });

  it("should not share caches over different virtual Documents", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualDocument1 = locateDocByRef(
      "https://arbitrary.doc/resource.ttl"
    );
    const virtualDocument2 = locateDocByRef(
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
});

describe("ensureForRef", () => {
  it("should return an existing Document if referred to", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const mockPredicate = "https://arbitrary.doc/vocabulary.ttl#predicate";
    const mockSubject = {};
    const virtualSubject = selectSubjectFromRef(
      "https://arbitrary.doc/resource.ttl#subject"
    );
    const virtualDocument = ensureDocForRef(virtualSubject, mockPredicate);

    fetchDocument(virtualDocument);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
    expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
      "https://arbitrary.doc/resource.ttl"
    );
  });
});
