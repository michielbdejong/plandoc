import { Reference } from "tripledoc";
import { VirtualContainer } from "../virtual/container";
import { VirtualSubject } from "../virtual/subject";
import { AclSettings } from "../services/acl";

export type ContainerDescriptor = IsFoundAt | IsFoundOn | IsContainedIn;

export interface IsFoundAt {
  type: "IsFoundAt";
  reference: Reference;
}
/**
 * @ignore
 */
export function internal_isIsFoundAt(
  virtualContainer: VirtualContainer
): virtualContainer is VirtualContainer<IsFoundAt> {
  return virtualContainer.internal_descriptor.type === "IsFoundAt";
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
  acl: AclSettings;
}
/**
 * @ignore
 */
export function internal_isIsContainedIn(
  virtualContainer: VirtualContainer
): virtualContainer is VirtualContainer<IsContainedIn> {
  return virtualContainer.internal_descriptor.type === "IsContainedIn";
}
