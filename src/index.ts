export {
  BareTripleDocument,
  LocalTripleDocumentWithRef,
  TripleDocument,
  TripleSubject,
  LiteralTypes,
  Reference
} from "tripledoc";
export { describeContainer, VirtualContainer } from "./virtual/container";
export { describeDocument, VirtualDocument } from "./virtual/document";
export { fetchDocument } from "./actors/document";
export { internal_fetchContainer } from "./actors/container";
export { describeSubject, VirtualSubject } from "./virtual/subject";
export { serialise as experimental_serialise } from "./virtual/serialise";
