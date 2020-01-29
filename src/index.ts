export {
  BareTripleDocument,
  LocalTripleDocument,
  TripleDocument,
  TripleSubject,
  LiteralTypes,
  Reference
} from "tripledoc";
export { describeContainer, VirtualContainer } from "./virtual/container";
export { internal_fetchContainer as experimental_fetchContainer } from "./actors/container";
export { describeDocument, VirtualDocument } from "./virtual/document";
export { fetchDocument } from "./actors/document";
export { describeSubject, VirtualSubject } from "./virtual/subject";
export { internal_fetchSubject as experimental_fetchSubject } from "./actors/subject";
export { serialise as experimental_serialise } from "./virtual/serialise";
