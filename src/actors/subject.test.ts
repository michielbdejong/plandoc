import { describeSubject } from "../virtual/subject";
import { fetchSubject } from "./subject";
import { Reference } from "tripledoc";

let mockSubject: { [key: string]: jest.Mock };
let mockDocument: { [key: string]: jest.Mock };
jest.mock("tripledoc", () => {
  mockSubject = {
    getRef: jest
      .fn()
      .mockReturnValue("https://arbitrary-doc.com/#arbitrary-subject"),
    getDocument: jest.fn(() => mockDocument)
  };
  mockDocument = {
    getSubject: jest.fn(() => mockSubject),
    addSubject: jest.fn(),
    save: jest.fn(() => Promise.resolve(mockDocument))
  };
  return {
    fetchDocument: jest.fn().mockReturnValue(Promise.resolve(mockDocument))
  };
});

describe("fetchSubject", () => {
  it("should pass on a direct reference to Tripledoc", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualSubject = describeSubject().isFoundAt(
      "https://arbitrary.doc/resource.ttl#subject"
    );

    fetchSubject(virtualSubject);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
    expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
      "https://arbitrary.doc/resource.ttl#subject"
    );
  });

  it("should re-use cached responses", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualSubject = describeSubject().isFoundAt(
      "https://arbitrary.doc/resource.ttl#subject"
    );

    fetchSubject(virtualSubject);
    fetchSubject(virtualSubject);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
  });

  it("should re-use in-progress requests", () => {
    const tripledoc = jest.requireMock("tripledoc");
    tripledoc.fetchDocument.mockReturnValueOnce(new Promise(() => undefined));
    const virtualSubject = describeSubject().isFoundAt(
      "https://arbitrary.doc/resource.ttl#subject"
    );

    fetchSubject(virtualSubject);
    fetchSubject(virtualSubject);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
  });

  it("should not share caches over different virtual Subjects", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualSubject1 = describeSubject().isFoundAt(
      "https://arbitrary.doc/resource.ttl#subject"
    );
    const virtualSubject2 = describeSubject().isFoundAt(
      "https://arbitrary.doc/resource.ttl#subject"
    );

    fetchSubject(virtualSubject1);
    fetchSubject(virtualSubject2);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(2);
    expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
      "https://arbitrary.doc/resource.ttl#subject"
    );
    expect(tripledoc.fetchDocument.mock.calls[1][0]).toBe(
      "https://arbitrary.doc/resource.ttl#subject"
    );
  });

  describe("found on another Subject", () => {
    it("should retrieve it if it exists", async () => {
      const mockOtherSubject = {
        ...mockSubject,
        getRef: jest.fn(
          (_predicate: Reference) => "https://some.doc/resource.ttl#subject"
        )
      };
      const mockGetSubject = (ref: Reference) => {
        return ref === "https://some.doc/resource.ttl#subject"
          ? "The Subject we are looking for"
          : mockOtherSubject;
      };
      mockDocument.getSubject.mockImplementationOnce(mockGetSubject);
      mockDocument.getSubject.mockImplementationOnce(mockGetSubject);

      const otherSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualSubject = describeSubject().isFoundOn(
        otherSubject,
        "https://mock-vocab.example/#some-predicate"
      );

      const retrievedSubject = await fetchSubject(virtualSubject);

      expect(retrievedSubject).toBe("The Subject we are looking for");
      expect(mockOtherSubject.getRef.mock.calls.length).toBe(1);
      expect(mockOtherSubject.getRef.mock.calls[0][0]).toBe(
        "https://mock-vocab.example/#some-predicate"
      );
    });

    it("should return null if the source Subject could not be found", async () => {
      mockDocument.getSubject.mockReturnValueOnce(null);

      const otherSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualSubject = describeSubject().isFoundOn(
        otherSubject,
        "https://mock-vocab.example/#some-predicate"
      );

      const retrievedSubject = await fetchSubject(virtualSubject);

      expect(retrievedSubject).toBeNull();
    });

    it("should return null if no Subject was referred to on the source Subject", async () => {
      const mockOtherSubject = {
        ...mockSubject,
        getRef: jest.fn((_predicate: Reference) => null)
      };
      mockDocument.getSubject.mockReturnValueOnce(mockOtherSubject);

      const otherSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualSubject = describeSubject().isFoundOn(
        otherSubject,
        "https://mock-vocab.example/#some-predicate"
      );

      const retrievedSubject = await fetchSubject(virtualSubject);

      expect(retrievedSubject).toBeNull();
    });
  });

  describe("ensured on another Subject", () => {
    it("should retrieve it if it exists", async () => {
      const mockOtherSubject = {
        ...mockSubject,
        getRef: jest.fn(
          (_predicate: Reference) => "https://some.doc/resource.ttl#subject"
        )
      };
      const mockGetSubject = (ref: Reference) => {
        return ref === "https://some.doc/resource.ttl#subject"
          ? "The Subject we are looking for"
          : mockOtherSubject;
      };
      mockDocument.getSubject.mockImplementationOnce(mockGetSubject);
      mockDocument.getSubject.mockImplementationOnce(mockGetSubject);

      const otherSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualSubject = describeSubject().isEnsuredOn(
        otherSubject,
        "https://mock-vocab.example/#some-predicate"
      );

      const retrievedSubject = await fetchSubject(virtualSubject);

      expect(retrievedSubject).toBe("The Subject we are looking for");
      expect(mockOtherSubject.getRef.mock.calls.length).toBe(1);
      expect(mockOtherSubject.getRef.mock.calls[0][0]).toBe(
        "https://mock-vocab.example/#some-predicate"
      );
    });

    it("should return null if the source Subject could not be found", async () => {
      mockDocument.getSubject.mockReturnValueOnce(null);

      const otherSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualSubject = describeSubject().isEnsuredOn(
        otherSubject,
        "https://mock-vocab.example/#some-predicate"
      );

      const retrievedSubject = await fetchSubject(virtualSubject);

      expect(retrievedSubject).toBeNull();
    });

    it("should add a new Subject if no Subject was referred to on the source Subject", async () => {
      const mockNewSubject = { asRef: jest.fn(() => "New Subject Ref") };
      const mockUpdatedDocument = {
        getSubject: jest.fn((_ref: string) => "New Subject in Updated Doc")
      };
      const mockOtherSubject = {
        ...mockSubject,
        getRef: jest.fn((_predicate: Reference) => null),
        addRef: jest.fn()
      };
      mockDocument.getSubject.mockReturnValueOnce(mockOtherSubject);
      mockDocument.addSubject.mockReturnValueOnce(mockNewSubject);
      mockDocument.save.mockReturnValueOnce(
        Promise.resolve(mockUpdatedDocument)
      );

      const otherSubject = describeSubject().isFoundAt(
        "https://arbitrary.doc/resource.ttl#subject"
      );
      const virtualSubject = describeSubject().isEnsuredOn(
        otherSubject,
        "https://mock-vocab.example/#some-predicate"
      );

      const retrievedSubject = await fetchSubject(virtualSubject);

      expect(retrievedSubject).toEqual("New Subject in Updated Doc");
      expect(mockOtherSubject.addRef.mock.calls.length).toBe(1);
      expect(mockOtherSubject.addRef.mock.calls[0][0]).toBe(
        "https://mock-vocab.example/#some-predicate"
      );
      expect(mockOtherSubject.addRef.mock.calls[0][1]).toBe("New Subject Ref");
      expect(mockUpdatedDocument.getSubject.mock.calls.length).toBe(1);
      expect(mockUpdatedDocument.getSubject.mock.calls[0][0]).toBe(
        "New Subject Ref"
      );
    });
  });
});
