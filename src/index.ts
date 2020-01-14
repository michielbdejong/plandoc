export {
  BareTripleDocument,
  LocalTripleDocument,
  TripleDocument,
  TripleSubject,
  LiteralTypes,
  Reference
} from "tripledoc";
export { describeContainer, VirtualContainer } from "./virtual/container";
export { fetchContainer } from "./actors/container";
export { describeDocument, VirtualDocument } from "./virtual/document";
export { fetchDocument } from "./actors/document";
export { describeSubject, VirtualSubject } from "./virtual/subject";
export { fetchSubject } from "./actors/subject";
export { describeSubjectList, VirtualSubjectList } from "./virtual/subjectList";
export { fetchSubjectList } from "./actors/subjectList";
