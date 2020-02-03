import { describeSubject } from "../virtual/subject";
import { internal_fetchSubject } from "./subject";
import { Reference } from "tripledoc";
import { describeDocument } from "../virtual/document";
import { dct } from "rdf-namespaces";

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
      .mockReturnValue("https://arbitrary.pod/document.ttl#subject"),
    getDocument: jest.fn(() => mockDocument)
  };
  mockDocument = {
    getSubject: jest.fn(() => mockSubject),
    findSubjects: jest.fn(() => [mockSubject]),
    addSubject: jest.fn(),
    asRef: jest.fn(),
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
      "https://some.pod/document.ttl#subject"
    );

    internal_fetchSubject(virtualSubject);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
    expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
      "https://some.pod/document.ttl#subject"
    );
  });

  it("should re-use cached responses", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualSubject = describeSubject().isFoundAt(
      "https://arbitrary.pod/document.ttl#subject"
    );

    internal_fetchSubject(virtualSubject);
    internal_fetchSubject(virtualSubject);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
  });

  it("should re-use in-progress requests", () => {
    const tripledoc = jest.requireMock("tripledoc");
    tripledoc.fetchDocument.mockReturnValueOnce(new Promise(() => undefined));
    const virtualSubject = describeSubject().isFoundAt(
      "https://arbitrary.pod/document.ttl#subject"
    );

    internal_fetchSubject(virtualSubject);
    internal_fetchSubject(virtualSubject);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
  });

  it("should not share caches over different virtual Subjects", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualSubject1 = describeSubject().isFoundAt(
      "https://some.pod/document.ttl#subject"
    );
    const virtualSubject2 = describeSubject().isFoundAt(
      "https://some.pod/document.ttl#subject"
    );

    internal_fetchSubject(virtualSubject1);
    internal_fetchSubject(virtualSubject2);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(2);
    expect(tripledoc.fetchDocument.mock.calls[0][0]).toBe(
      "https://some.pod/document.ttl#subject"
    );
    expect(tripledoc.fetchDocument.mock.calls[1][0]).toBe(
      "https://some.pod/document.ttl#subject"
    );
  });

  it("should error when the type of Virtual Subject is unsupported", async () => {
    const virtualSubject = {
      internal_descriptor: { type: "Some unsupported type of Virtual Subject" }
    };

    await expect(
      internal_fetchSubject(virtualSubject as any)
    ).rejects.toThrowError(
      "This type of Virtual Subject can not be processed yet."
    );
  });

  describe("found on another Subject", () => {
    it("should retrieve it if it exists", async () => {
      const mockOtherSubject = {
        ...mockSubject,
        getRef: jest.fn(
          (_predicate: Reference) => "https://some.pod/document.ttl#subject"
        )
      };
      const mockGetSubject = (ref: Reference) => {
        return ref === "https://some.pod/document.ttl#subject"
          ? "The Subject we are looking for"
          : mockOtherSubject;
      };
      mockDocument.getSubject.mockImplementationOnce(mockGetSubject);
      mockDocument.getSubject.mockImplementationOnce(mockGetSubject);

      const otherSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualSubject = describeSubject().isFoundOn(
        otherSubject,
        "https://some.vocab/#predicate"
      );

      const retrievedSubject = await internal_fetchSubject(virtualSubject);

      expect(retrievedSubject).toBe("The Subject we are looking for");
      expect(mockOtherSubject.getRef.mock.calls.length).toBe(1);
      expect(mockOtherSubject.getRef.mock.calls[0][0]).toBe(
        "https://some.vocab/#predicate"
      );
    });

    it("should return null if the source Subject could not be found", async () => {
      mockDocument.getSubject.mockReturnValueOnce(null);

      const otherSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualSubject = describeSubject().isFoundOn(
        otherSubject,
        "https://arbitrary.vocab/#predicate"
      );

      const retrievedSubject = await internal_fetchSubject(virtualSubject);

      expect(retrievedSubject).toBeNull();
    });

    it("should return null if no Subject was referred to on the source Subject", async () => {
      const mockOtherSubject = {
        ...mockSubject,
        getRef: jest.fn((_predicate: Reference) => null)
      };
      mockDocument.getSubject.mockReturnValueOnce(mockOtherSubject);

      const otherSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualSubject = describeSubject().isFoundOn(
        otherSubject,
        "https://arbitrary.vocab/#predicate"
      );

      const retrievedSubject = await internal_fetchSubject(virtualSubject);

      expect(retrievedSubject).toBeNull();
    });
  });

  describe("ensured on another Subject", () => {
    it("should retrieve it if it exists", async () => {
      const mockOtherSubject = {
        ...mockSubject,
        getRef: jest.fn(
          (_predicate: Reference) => "https://some.pod/document.ttl#subject"
        )
      };
      const mockGetSubject = (ref: Reference) => {
        return ref === "https://some.pod/document.ttl#subject"
          ? "The Subject we are looking for"
          : mockOtherSubject;
      };
      mockDocument.getSubject.mockImplementationOnce(mockGetSubject);
      mockDocument.getSubject.mockImplementationOnce(mockGetSubject);

      const otherSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualSubject = describeSubject().isEnsuredOn(
        otherSubject,
        "https://some.vocab/#predicate"
      );

      const retrievedSubject = await internal_fetchSubject(virtualSubject);

      expect(retrievedSubject).toBe("The Subject we are looking for");
      expect(mockOtherSubject.getRef.mock.calls.length).toBe(1);
      expect(mockOtherSubject.getRef.mock.calls[0][0]).toBe(
        "https://some.vocab/#predicate"
      );
    });

    it("should return null if the source Subject could not be found", async () => {
      mockDocument.getSubject.mockReturnValueOnce(null);

      const otherSubject = describeSubject().isFoundAt(
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualSubject = describeSubject().isEnsuredOn(
        otherSubject,
        "https://arbitrary.vocab/#predicate"
      );

      const retrievedSubject = await internal_fetchSubject(virtualSubject);

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
        "https://arbitrary.pod/document.ttl#subject"
      );
      const virtualSubject = describeSubject().isEnsuredOn(
        otherSubject,
        "https://some.vocab/#predicate"
      );

      const retrievedSubject = await internal_fetchSubject(virtualSubject);

      expect(retrievedSubject).toEqual("New Subject in Updated Doc");
      expect(mockOtherSubject.addRef.mock.calls.length).toBe(1);
      expect(mockOtherSubject.addRef.mock.calls[0][0]).toBe(
        "https://some.vocab/#predicate"
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
        "https://arbitrary.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .withRef(
          "https://some.vocab/#predicate",
          "https://some-other.pod/document.ttl#object"
        );
      mockSubject.getRef.mockReturnValueOnce(
        "https://some-other.pod/document.ttl#object"
      );
      mockDocument.findSubjects.mockReturnValueOnce([mockSubject]);

      const fetchedSubject = await internal_fetchSubject(virtualSubject);

      expect(fetchedSubject).toEqual(mockSubject);
      expect(mockDocument.findSubjects.mock.calls.length).toBe(1);
      expect(mockDocument.findSubjects.mock.calls[0][0]).toBe(
        "https://some.vocab/#predicate"
      );
      expect(mockDocument.findSubjects.mock.calls[0][1]).toBe(
        "https://some-other.pod/document.ttl#object"
      );
    });

    it("should be able to find it when selecting by multiple Predicates", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .withRef(
          "https://some.vocab/#predicate",
          "https://some-other.pod/document.ttl#object"
        )
        .withRef(
          "https://mock-vocab.example/#some-other-predicate",
          "https://some-other.pod/document.ttl#other-object"
        );
      mockSubject.getRef.mockReturnValueOnce(
        "https://some-other.pod/document.ttl#object"
      );
      mockSubject.getRef.mockReturnValueOnce(
        "https://some-other.pod/document.ttl#other-object"
      );
      mockDocument.findSubjects.mockReturnValueOnce([mockSubject]);

      const fetchedSubject = await internal_fetchSubject(virtualSubject);

      expect(fetchedSubject).toEqual(mockSubject);
      expect(mockDocument.findSubjects.mock.calls.length).toBe(1);
      expect(mockDocument.findSubjects.mock.calls[0][0]).toBe(
        "https://some.vocab/#predicate"
      );
      expect(mockDocument.findSubjects.mock.calls[0][1]).toBe(
        "https://some-other.pod/document.ttl#object"
      );
    });

    it("should not be able to find it when only the first predicate matches", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .withRef(
          "https://some.vocab/#predicate",
          "https://some-other.pod/document.ttl#object"
        )
        .withRef(
          "https://mock-vocab.example/#some-other-predicate",
          "https://some-other.pod/document.ttl#other-object"
        );
      mockSubject.getRef.mockReturnValueOnce(
        "https://some-other.pod/document.ttl#object"
      );
      mockDocument.findSubjects.mockReturnValueOnce([mockSubject]);

      const fetchedSubject = await internal_fetchSubject(virtualSubject);

      expect(fetchedSubject).toBeNull();
      expect(mockDocument.findSubjects.mock.calls.length).toBe(1);
      expect(mockDocument.findSubjects.mock.calls[0][0]).toBe(
        "https://some.vocab/#predicate"
      );
      expect(mockDocument.findSubjects.mock.calls[0][1]).toBe(
        "https://some-other.pod/document.ttl#object"
      );
    });

    it("should not be able to find it when the first predicate already does not match", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .withRef(
          "https://some.vocab/#predicate",
          "https://some-other.pod/document.ttl#object"
        )
        .withRef(
          "https://mock-vocab.example/#some-other-predicate",
          "https://some-other.pod/document.ttl#other-object"
        );
      mockSubject.getRef.mockReturnValueOnce(
        "https://some-other.pod/document.ttl#arbitrary-invalid-object"
      );
      mockDocument.findSubjects.mockReturnValueOnce([mockSubject]);

      const fetchedSubject = await internal_fetchSubject(virtualSubject);

      expect(fetchedSubject).toBeNull();
      expect(mockDocument.findSubjects.mock.calls.length).toBe(1);
      expect(mockDocument.findSubjects.mock.calls[0][0]).toBe(
        "https://some.vocab/#predicate"
      );
      expect(mockDocument.findSubjects.mock.calls[0][1]).toBe(
        "https://some-other.pod/document.ttl#object"
      );
    });

    it("should not be able to find it when the given Document could not be found", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .withRef(
          "https://mock-vocab.example/#arbitrary-predicate",
          "https://arbitrary-other.pod/document.ttl#object"
        );
      const mockVirtualDocument = require.requireMock("./document.ts");
      mockVirtualDocument.fetchDocument.mockReturnValueOnce(
        Promise.resolve(null)
      );

      const fetchedSubject = await internal_fetchSubject(virtualSubject);

      expect(fetchedSubject).toBeNull();
    });

    it("does not yet support finding Documents without matching Predicates", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .withRef(
          "https://mock-vocab.example/#predicate-that-will-be-removed",
          "https://arbitrary-other.pod/document.ttl#object-that-will-be-removed"
        );
      // The typings disallow creating a VirtualSubject without enumerating the desired Predicates,
      // but we can manually manipulate the data structure to remove them again:
      virtualSubject.internal_descriptor.locator.references = [];

      await expect(internal_fetchSubject(virtualSubject)).rejects.toThrowError(
        "Please specify at least one property to identify this subject with."
      );
    });
  });

  describe("found in a given Document by Reference", () => {
    it("should retrieve it if it exists", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://some.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .asRef("https://some.pod/document.ttl#subject");
      mockDocument.getSubject.mockReturnValueOnce(mockSubject);

      const fetchedSubject = await internal_fetchSubject(virtualSubject);

      expect(fetchedSubject).toEqual(mockSubject);
      expect(mockDocument.getSubject.mock.calls.length).toBe(1);
      expect(mockDocument.getSubject.mock.calls[0][0]).toBe(
        "https://some.pod/document.ttl#subject"
      );
    });

    it("should not find it if it does not exist", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://some.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .asRef("https://some.pod/document.ttl#subject");
      mockDocument.getSubject.mockReturnValueOnce(null);

      const fetchedSubject = await internal_fetchSubject(virtualSubject);

      expect(fetchedSubject).toBeNull();
      expect(mockDocument.getSubject.mock.calls.length).toBe(1);
      expect(mockDocument.getSubject.mock.calls[0][0]).toBe(
        "https://some.pod/document.ttl#subject"
      );
    });

    it("should not retrieve it if an invalid Locator was given", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isFoundIn(mockContainingDocument)
        .asRef("https://arbitrary.pod/document.ttl#subject");
      // The typings disallow creating a VirtualSubject without a Locator,
      // but we can manually manipulate the data structure to change it:
      virtualSubject.internal_descriptor.locator = {
        arbitrary: "invalid Locator"
      } as any;

      await expect(internal_fetchSubject(virtualSubject)).rejects.toThrowError(
        "This type of Locator can not be processed yet."
      );
    });
  });

  describe("ensured in a given Document by matching predicates", () => {
    it("should retrieve it if it exists", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isEnsuredIn(mockContainingDocument)
        .withRef(
          "https://some.vocab/#predicate",
          "https://some-other.pod/document.ttl#object"
        );
      mockSubject.getRef.mockReturnValueOnce(
        "https://some-other.pod/document.ttl#object"
      );
      mockDocument.findSubjects.mockReturnValueOnce([mockSubject]);

      const fetchedSubject = await internal_fetchSubject(virtualSubject);

      expect(fetchedSubject).toEqual(mockSubject);
      expect(mockDocument.findSubjects.mock.calls.length).toBe(1);
      expect(mockDocument.findSubjects.mock.calls[0][0]).toBe(
        "https://some.vocab/#predicate"
      );
      expect(mockDocument.findSubjects.mock.calls[0][1]).toBe(
        "https://some-other.pod/document.ttl#object"
      );
    });

    it("should be able to find it when selecting by multiple Predicates", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isEnsuredIn(mockContainingDocument)
        .withRef(
          "https://some.vocab/#predicate",
          "https://some-other.pod/document.ttl#object"
        )
        .withRef(
          "https://mock-vocab.example/#some-other-predicate",
          "https://some-other.pod/document.ttl#other-object"
        );
      mockSubject.getRef.mockReturnValueOnce(
        "https://some-other.pod/document.ttl#object"
      );
      mockSubject.getRef.mockReturnValueOnce(
        "https://some-other.pod/document.ttl#other-object"
      );
      mockDocument.findSubjects.mockReturnValueOnce([mockSubject]);

      const fetchedSubject = await internal_fetchSubject(virtualSubject);

      expect(fetchedSubject).toEqual(mockSubject);
      expect(mockDocument.findSubjects.mock.calls.length).toBe(1);
      expect(mockDocument.findSubjects.mock.calls[0][0]).toBe(
        "https://some.vocab/#predicate"
      );
      expect(mockDocument.findSubjects.mock.calls[0][1]).toBe(
        "https://some-other.pod/document.ttl#object"
      );
    });

    it("should try to create it when only the first predicate matches", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isEnsuredIn(mockContainingDocument)
        .withRef(
          "https://some.vocab/#predicate",
          "https://some-other.pod/document.ttl#object"
        )
        .withRef(
          "https://mock-vocab.example/#some-other-predicate",
          "https://some-other.pod/document.ttl#other-object"
        );
      mockSubject.getRef.mockReturnValueOnce(
        "https://some-other.pod/document.ttl#object"
      );
      mockDocument.findSubjects.mockReturnValueOnce([mockSubject]);
      const mockNewSubject = {
        addRef: jest.fn(),
        asRef: jest.fn(() => "New Subject Ref")
      };
      mockDocument.addSubject.mockReturnValueOnce(mockNewSubject);
      const mockRootSubject = { addRef: jest.fn() };
      mockDocument.getSubject.mockReturnValueOnce(mockRootSubject);
      mockDocument.getSubject.mockReturnValueOnce(mockNewSubject);

      const fetchedSubject = await internal_fetchSubject(virtualSubject);

      expect(fetchedSubject).toEqual(mockNewSubject);
      expect(mockDocument.findSubjects.mock.calls.length).toBe(1);
      expect(mockDocument.findSubjects.mock.calls[0][0]).toBe(
        "https://some.vocab/#predicate"
      );
      expect(mockDocument.findSubjects.mock.calls[0][1]).toBe(
        "https://some-other.pod/document.ttl#object"
      );
      expect(mockNewSubject.addRef.mock.calls.length).toBe(2);
      expect(mockNewSubject.addRef.mock.calls[0][0]).toBe(
        "https://some.vocab/#predicate"
      );
      expect(mockNewSubject.addRef.mock.calls[0][1]).toBe(
        "https://some-other.pod/document.ttl#object"
      );
      expect(mockNewSubject.addRef.mock.calls[1][0]).toBe(
        "https://mock-vocab.example/#some-other-predicate"
      );
      expect(mockNewSubject.addRef.mock.calls[1][1]).toBe(
        "https://some-other.pod/document.ttl#other-object"
      );
      expect(mockRootSubject.addRef.mock.calls[0]).toEqual([
        dct.references,
        "New Subject Ref"
      ]);
      expect(mockDocument.save.mock.calls.length).toBe(1);
      expect(mockDocument.save.mock.calls[0][0]).toEqual([
        mockNewSubject,
        mockRootSubject
      ]);
    });

    it("should try to create it when the first predicate already does not match", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isEnsuredIn(mockContainingDocument)
        .withRef(
          "https://some.vocab/#predicate",
          "https://some-other.pod/document.ttl#object"
        )
        .withRef(
          "https://mock-vocab.example/#some-other-predicate",
          "https://some-other.pod/document.ttl#other-object"
        );
      mockDocument.findSubjects.mockReturnValueOnce([mockSubject]);
      const mockNewSubject = {
        addRef: jest.fn(),
        asRef: jest.fn(() => "New Subject Ref")
      };
      mockDocument.addSubject.mockReturnValueOnce(mockNewSubject);
      const mockRootSubject = { addRef: jest.fn() };
      mockDocument.getSubject.mockReturnValueOnce(mockRootSubject);
      mockDocument.getSubject.mockReturnValueOnce(mockNewSubject);

      const fetchedSubject = await internal_fetchSubject(virtualSubject);

      expect(fetchedSubject).toEqual(mockNewSubject);
      expect(mockDocument.findSubjects.mock.calls.length).toBe(1);
      expect(mockDocument.findSubjects.mock.calls[0][0]).toBe(
        "https://some.vocab/#predicate"
      );
      expect(mockDocument.findSubjects.mock.calls[0][1]).toBe(
        "https://some-other.pod/document.ttl#object"
      );
      expect(mockNewSubject.addRef.mock.calls.length).toBe(2);
      expect(mockNewSubject.addRef.mock.calls[0][0]).toBe(
        "https://some.vocab/#predicate"
      );
      expect(mockNewSubject.addRef.mock.calls[0][1]).toBe(
        "https://some-other.pod/document.ttl#object"
      );
      expect(mockNewSubject.addRef.mock.calls[1][0]).toBe(
        "https://mock-vocab.example/#some-other-predicate"
      );
      expect(mockNewSubject.addRef.mock.calls[1][1]).toBe(
        "https://some-other.pod/document.ttl#other-object"
      );
      expect(mockRootSubject.addRef.mock.calls[0]).toEqual([
        dct.references,
        "New Subject Ref"
      ]);
      expect(mockDocument.save.mock.calls.length).toBe(1);
      expect(mockDocument.save.mock.calls[0][0]).toEqual([
        mockNewSubject,
        mockRootSubject
      ]);
    });

    it("should not be able to find it when the given Document could not be found", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isEnsuredIn(mockContainingDocument)
        .withRef(
          "https://mock-vocab.example/#arbitrary-predicate",
          "https://arbitrary-other.pod/document.ttl#object"
        );
      const mockVirtualDocument = require.requireMock("./document.ts");
      mockVirtualDocument.fetchDocument.mockReturnValueOnce(
        Promise.resolve(null)
      );

      const fetchedSubject = await internal_fetchSubject(virtualSubject);

      expect(fetchedSubject).toBeNull();
    });

    it("does not yet support finding Documents without matching Predicates", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isEnsuredIn(mockContainingDocument)
        .withRef(
          "https://mock-vocab.example/#predicate-that-will-be-removed",
          "https://arbitrary-other.pod/document.ttl#object-that-will-be-removed"
        );
      // The typings disallow creating a VirtualSubject without enumerating the desired Predicates,
      // but we can manually manipulate the data structure to remove them again:
      virtualSubject.internal_descriptor.locator.references = [];

      await expect(internal_fetchSubject(virtualSubject)).rejects.toThrowError(
        "Please specify at least one property to identify this subject with."
      );
    });
  });

  describe("ensured in a given Document by Reference", () => {
    it("should retrieve it if it exists", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://some.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isEnsuredIn(mockContainingDocument)
        .asRef("https://some.pod/document.ttl#subject");
      mockDocument.getSubject.mockReturnValueOnce(mockSubject);

      const fetchedSubject = await internal_fetchSubject(virtualSubject);

      expect(fetchedSubject).toEqual(mockSubject);
      expect(mockDocument.getSubject.mock.calls.length).toBe(1);
      expect(mockDocument.getSubject.mock.calls[0][0]).toBe(
        "https://some.pod/document.ttl#subject"
      );
    });

    it("should create it if it does not exist yet", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://some.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isEnsuredIn(mockContainingDocument)
        .asRef("https://some.pod/document.ttl#subject");
      mockDocument.getSubject.mockReturnValueOnce(null);
      mockDocument.asRef.mockReturnValueOnce("https://some.pod/document.ttl");
      mockDocument.addSubject.mockReturnValueOnce("Mocked new Subject");

      const fetchedSubject = await internal_fetchSubject(virtualSubject);

      expect(fetchedSubject).toEqual("Mocked new Subject");
      expect(mockDocument.getSubject.mock.calls.length).toBe(1);
      expect(mockDocument.getSubject.mock.calls[0][0]).toBe(
        "https://some.pod/document.ttl#subject"
      );
      expect(mockDocument.addSubject.mock.calls.length).toBe(1);
      expect(mockDocument.addSubject.mock.calls[0][0]).toEqual({
        identifier: "subject"
      });
    });

    it("should not retrieve it if an invalid Locator was given", async () => {
      const mockContainingDocument = describeDocument().isFoundAt(
        "https://arbitrary.pod/document.ttl"
      );
      const virtualSubject = describeSubject()
        .isEnsuredIn(mockContainingDocument)
        .asRef("https://arbitrary.pod/document.ttl#subject");
      // The typings disallow creating a VirtualSubject without a Locator,
      // but we can manually manipulate the data structure to change it:
      virtualSubject.internal_descriptor.locator = {
        arbitrary: "invalid Locator"
      } as any;

      await expect(internal_fetchSubject(virtualSubject)).rejects.toThrowError(
        "This type of Locator can not be processed yet."
      );
    });
  });
});
