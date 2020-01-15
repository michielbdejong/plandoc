import { describeSubject } from "../virtual/subject";
import { fetchSubject } from "./subject";
import { Reference } from "tripledoc";
import { describeDocument } from "../virtual/document";

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
    getDocument: jest.fn(() => mockDocument)
  };
  mockDocument = {
    getSubject: jest.fn(() => mockSubject),
    findSubjects: jest.fn(() => [mockSubject]),
    addSubject: jest.fn(),
    save: jest.fn(() => Promise.resolve(mockDocument))
  };
}
jest.mock("tripledoc", () => {
  initialiseMocks();
  return {
    fetchDocument: jest.fn().mockReturnValue(Promise.resolve(mockDocument))
  };
});
jest.mock("./document.ts", () => {
  initialiseMocks();
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

  describe("found in a given Document by matching predicates", () => {
    it("should retrieve it if it exists", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.doc/resource.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .withRef(
          "https://mock-vocab.example/#some-predicate",
          "https:/arbitrary-other.doc/resource.ttl#some-object"
        );
      mockSubject.getRef.mockReturnValueOnce(
        "https:/arbitrary-other.doc/resource.ttl#some-object"
      );
      mockDocument.findSubjects.mockReturnValueOnce([mockSubject]);

      const fetchedSubject = await fetchSubject(virtualSubject);

      expect(fetchedSubject).toEqual(mockSubject);
      expect(mockDocument.findSubjects.mock.calls.length).toBe(1);
      expect(mockDocument.findSubjects.mock.calls[0][0]).toBe(
        "https://mock-vocab.example/#some-predicate"
      );
      expect(mockDocument.findSubjects.mock.calls[0][1]).toBe(
        "https:/arbitrary-other.doc/resource.ttl#some-object"
      );
    });

    it("should be able to find it when selecting by multiple Predicates", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.doc/resource.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .withRef(
          "https://mock-vocab.example/#some-predicate",
          "https:/arbitrary-other.doc/resource.ttl#some-object"
        )
        .withRef(
          "https://mock-vocab.example/#some-other-predicate",
          "https:/arbitrary-other.doc/resource.ttl#some-other-object"
        );
      mockSubject.getRef.mockReturnValueOnce(
        "https:/arbitrary-other.doc/resource.ttl#some-object"
      );
      mockSubject.getRef.mockReturnValueOnce(
        "https:/arbitrary-other.doc/resource.ttl#some-other-object"
      );
      mockDocument.findSubjects.mockReturnValueOnce([mockSubject]);

      const fetchedSubject = await fetchSubject(virtualSubject);

      expect(fetchedSubject).toEqual(mockSubject);
      expect(mockDocument.findSubjects.mock.calls.length).toBe(1);
      expect(mockDocument.findSubjects.mock.calls[0][0]).toBe(
        "https://mock-vocab.example/#some-predicate"
      );
      expect(mockDocument.findSubjects.mock.calls[0][1]).toBe(
        "https:/arbitrary-other.doc/resource.ttl#some-object"
      );
    });

    it("should not be able to find it when only the first predicate matches", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.doc/resource.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .withRef(
          "https://mock-vocab.example/#some-predicate",
          "https:/arbitrary-other.doc/resource.ttl#some-object"
        )
        .withRef(
          "https://mock-vocab.example/#some-other-predicate",
          "https:/arbitrary-other.doc/resource.ttl#some-other-object"
        );
      mockSubject.getRef.mockReturnValueOnce(
        "https:/arbitrary-other.doc/resource.ttl#some-object"
      );
      mockDocument.findSubjects.mockReturnValueOnce([mockSubject]);

      const fetchedSubject = await fetchSubject(virtualSubject);

      expect(fetchedSubject).toBeNull();
      expect(mockDocument.findSubjects.mock.calls.length).toBe(1);
      expect(mockDocument.findSubjects.mock.calls[0][0]).toBe(
        "https://mock-vocab.example/#some-predicate"
      );
      expect(mockDocument.findSubjects.mock.calls[0][1]).toBe(
        "https:/arbitrary-other.doc/resource.ttl#some-object"
      );
    });

    it("should not be able to find it when only the second predicate matches", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.doc/resource.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .withRef(
          "https://mock-vocab.example/#some-predicate",
          "https:/arbitrary-other.doc/resource.ttl#some-object"
        )
        .withRef(
          "https://mock-vocab.example/#some-other-predicate",
          "https:/arbitrary-other.doc/resource.ttl#some-other-object"
        );
      mockSubject.getRef.mockReturnValueOnce(
        "https:/arbitrary-other.doc/resource.ttl#arbitrary-invalid-object"
      );
      mockSubject.getRef.mockReturnValueOnce(
        "https:/arbitrary-other.doc/resource.ttl#some-other-object"
      );
      mockDocument.findSubjects.mockReturnValueOnce([mockSubject]);

      const fetchedSubject = await fetchSubject(virtualSubject);

      expect(fetchedSubject).toBeNull();
      expect(mockDocument.findSubjects.mock.calls.length).toBe(1);
      expect(mockDocument.findSubjects.mock.calls[0][0]).toBe(
        "https://mock-vocab.example/#some-predicate"
      );
      expect(mockDocument.findSubjects.mock.calls[0][1]).toBe(
        "https:/arbitrary-other.doc/resource.ttl#some-object"
      );
    });

    it("should not be able to find it when the given Document could not be found", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.doc/resource.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .withRef(
          "https://mock-vocab.example/#arbitrary-predicate",
          "https:/arbitrary-other.doc/resource.ttl#arbitrary-object"
        );
      const mockVirtualDocument = require.requireMock("./document.ts");
      mockVirtualDocument.fetchDocument.mockReturnValueOnce(
        Promise.resolve(null)
      );

      const fetchedSubject = await fetchSubject(virtualSubject);

      expect(fetchedSubject).toBeNull();
    });

    it("does not yet support finding Documents without matching Predicates", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.doc/resource.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .withRef(
          "https://mock-vocab.example/#predicate-that-will-be-removed",
          "https:/arbitrary-other.doc/resource.ttl#object-that-will-be-removed"
        );
      // The typings disallow creating a VirtualSubject without enumerating the desired Predicates,
      // but we can manually manipulate the data structure to remove them again:
      virtualSubject.internal_descriptor.locator.references = [];

      await expect(fetchSubject(virtualSubject)).rejects.toThrowError(
        "Please specify at least one property to identify this subject with."
      );
    });
  });

  describe("found in a given Document by Reference", () => {
    it("should retrieve it if it exists", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.doc/resource.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .asRef("https://arbitrary.doc/resource.ttl#some-subject");
      mockDocument.getSubject.mockReturnValueOnce(mockSubject);

      const fetchedSubject = await fetchSubject(virtualSubject);

      expect(fetchedSubject).toEqual(mockSubject);
      expect(mockDocument.getSubject.mock.calls.length).toBe(1);
      expect(mockDocument.getSubject.mock.calls[0][0]).toBe(
        "https://arbitrary.doc/resource.ttl#some-subject"
      );
    });

    it("should not retrieve it if an invalid Locator was given", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.doc/resource.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .asRef("https://arbitrary.doc/resource.ttl#some-subject");
      // The typings disallow creating a VirtualSubject without a Locator,
      // but we can manually manipulate the data structure to change it:
      virtualSubject.internal_descriptor.locator = {
        arbitrary: "invalid Locator"
      } as any;

      await expect(fetchSubject(virtualSubject)).rejects.toThrowError(
        "This type of Locator can not be processed yet."
      );
    });
  });
});
