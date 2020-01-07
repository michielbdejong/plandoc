import { fetchDocument as fetchTripleDocument, TripleSubject } from "tripledoc";
import { VirtualSubjectList } from "../virtual/subjectList";
import {
  internal_isIsFoundIn,
  SubjectListDescriptor,
  IsFoundIn,
  internal_isIsFoundOn,
  IsFoundOn
} from "../descriptors/subjectList";
import { fetchDocument } from "./document";
import { fetchSubject } from "./subject";

export async function fetchSubjectList(
  virtualSubjectList: VirtualSubjectList
): Promise<TripleSubject[] | null> {
  if (typeof virtualSubjectList.promise !== "undefined") {
    return virtualSubjectList.promise;
  }

  const promise = internal_isIsFoundIn(virtualSubjectList)
    ? getWithRefs(virtualSubjectList)
    : internal_isIsFoundOn(virtualSubjectList)
    ? getOnSubject(virtualSubjectList)
    : Promise.reject(
        new Error("This type of Virtual Subject List can not be processed yet.")
      );

  virtualSubjectList.promise = promise;

  return promise;
}

type SubjectListFetcher<Descriptor extends SubjectListDescriptor> = (
  virtualSubject: VirtualSubjectList<Descriptor>
) => Promise<TripleSubject[] | null>;

const getWithRefs: SubjectListFetcher<IsFoundIn> = async virtualSubjectList => {
  const document = await fetchDocument(
    virtualSubjectList.internal_descriptor.document
  );

  if (document === null) {
    return null;
  }

  const references = virtualSubjectList.internal_descriptor.references;

  if (references.length === 0) {
    // TODO: Support just fetching one of the Subjects in this Document, if any
    //       (This requires an update on Tripledoc.)
    throw new Error(
      "Please specify at least one property to identify these Subjects with."
    );
  }

  const subjectsMatchingFirstRef = document.findSubjects(
    references[0].predicate,
    references[0].object
  );
  const matchingSubjects = subjectsMatchingFirstRef.filter(subject => {
    return references.every(
      ({ predicate, object }) => subject.getRef(predicate) === object
    );
  });

  return matchingSubjects;
};

const getOnSubject: SubjectListFetcher<IsFoundOn> = async virtualSubjectList => {
  const subject = await fetchSubject(
    virtualSubjectList.internal_descriptor.subject
  );

  if (subject === null) {
    return null;
  }

  const references = subject.getAllRefs(
    virtualSubjectList.internal_descriptor.predicate
  );

  const subjectList = await Promise.all(
    references.map(async reference => {
      const document = await fetchTripleDocument(reference);
      return document.getSubject(reference);
    })
  );
  const localSubjects = subject.getAllLocalSubjects(
    virtualSubjectList.internal_descriptor.predicate
  );

  return subjectList.concat(localSubjects);
};
