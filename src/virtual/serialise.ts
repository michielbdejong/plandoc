import { VirtualDocument } from "./document";
import { VirtualContainer } from "./container";
import { VirtualSubject } from "./subject";

export function serialise(virtualDoc: HasDescriptor): object {
  const descriptor = virtualDoc.internal_descriptor;
  const keys = Object.keys(descriptor);
  const serialised = keys.reduce((soFar, key) => {
    const value: unknown = (descriptor as any)[key];
    const serialisedValue = hasDescriptor(value) ? serialise(value) : value;
    return {
      ...soFar,
      [key]: serialisedValue
    };
  }, {});

  return serialised;
}

type HasDescriptor = VirtualDocument | VirtualContainer | VirtualSubject;
function hasDescriptor(value: HasDescriptor | any): value is HasDescriptor {
  return (
    typeof value === "object" &&
    typeof value.internal_descriptor !== "undefined"
  );
}
