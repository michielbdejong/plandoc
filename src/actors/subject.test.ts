import { describeSubject } from "../virtual/subject";
import { fetchSubject } from "./subject";

jest.mock("tripledoc", () => ({
  fetchDocument: jest.fn().mockReturnValue(Promise.resolve())
}));

describe("fetchSubject", () => {
  it("should pass on a direct reference to Tripledoc", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualSubject = describeSubject().byRef(
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
    const virtualSubject = describeSubject().byRef(
      "https://arbitrary.doc/resource.ttl#subject"
    );

    fetchSubject(virtualSubject);
    fetchSubject(virtualSubject);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
  });

  it("should re-use in-progress requests", () => {
    const tripledoc = jest.requireMock("tripledoc");
    tripledoc.fetchDocument.mockReturnValueOnce(new Promise(() => undefined));
    const virtualSubject = describeSubject().byRef(
      "https://arbitrary.doc/resource.ttl#subject"
    );

    fetchSubject(virtualSubject);
    fetchSubject(virtualSubject);

    expect(tripledoc.fetchDocument.mock.calls.length).toBe(1);
  });

  it("should not share caches over different virtual Subjects", () => {
    const tripledoc = jest.requireMock("tripledoc");
    const virtualSubject1 = describeSubject().byRef(
      "https://arbitrary.doc/resource.ttl#subject"
    );
    const virtualSubject2 = describeSubject().byRef(
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
});
