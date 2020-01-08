import { Reference } from "tripledoc";
import { VirtualContainer } from "../virtual/container";
import { VirtualSubject } from "../virtual/subject";

export type ContainerDescriptor = ByRef | IsFoundOn | IsContainedIn;

export interface ByRef {
  type: "ByRef";
  reference: Reference;
}
/**
 * @ignore
 */
export function internal_isByRef(
  virtualContainer: VirtualContainer
): virtualContainer is VirtualContainer<ByRef> {
  return virtualContainer.internal_descriptor.type === "ByRef";
}

export interface IsFoundOn {
  type: "IsFoundOn";
  subject: VirtualSubject;
  predicate: Reference;
}
/**
 * @ignore
 */
export function internal_isIsFoundOn(
  virtualContainer: VirtualContainer
): virtualContainer is VirtualContainer<IsFoundOn> {
  return virtualContainer.internal_descriptor.type === "IsFoundOn";
}

export interface IsContainedIn {
  type: "IsContainedIn";
  container: VirtualContainer;
  name: string;
}
/**
 * @ignore
 */
export function internal_isIsContainedIn(
  virtualContainer: VirtualContainer
): virtualContainer is VirtualContainer<IsContainedIn> {
  return virtualContainer.internal_descriptor.type === "IsContainedIn";
}
