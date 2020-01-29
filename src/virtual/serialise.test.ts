import { describeDocument } from "./document";
import { describeSubject } from "./subject";
import { describeContainer } from "./container";
import { serialise } from "./serialise";

it("should be able serialise a simple Virtual Document", () => {
  const virtualDocument = describeDocument().isFoundAt(
    "https://some.pod/resource.ttl"
  );
  expect(serialise(virtualDocument)).toEqual({
    reference: "https://some.pod/resource.ttl",
    type: "IsFoundAt"
  });
});

it("should be able serialise a simple Virtual Container", () => {
  const virtualContainer = describeContainer().experimental_isFoundAt(
    "https://some.pod/container/"
  );
  expect(serialise(virtualContainer)).toEqual({
    reference: "https://some.pod/container/",
    type: "IsFoundAt"
  });
});

it("should be able serialise a simple Virtual Subject", () => {
  const virtualSubject = describeSubject().isFoundAt(
    "https://some.pod/resource.ttl#subject"
  );
  expect(serialise(virtualSubject)).toEqual({
    reference: "https://some.pod/resource.ttl#subject",
    type: "IsFoundAt"
  });
});

it("should be able serialise a complex, nested Virtual Document", () => {
  const virtualContainer = describeContainer().experimental_isFoundAt(
    "https://some.pod/container/"
  );
  const virtualSubject = describeSubject().isFoundAt(
    "https://some.pod/resource.ttl#subject"
  );
  const virtualDocument = describeDocument().isEnsuredOn(
    virtualSubject,
    "https://some.ontology/#predicate",
    virtualContainer
  );
  expect(serialise(virtualDocument)).toEqual({
    acl: {},
    fallbackContainer: {
      reference: "https://some.pod/container/",
      type: "IsFoundAt"
    },
    predicate: "https://some.ontology/#predicate",
    subject: {
      reference: "https://some.pod/resource.ttl#subject",
      type: "IsFoundAt"
    },
    type: "IsEnsuredOn"
  });
});
