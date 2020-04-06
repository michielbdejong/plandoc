# plandoc

Easily locate and manipulate [RDF](https://en.wikipedia.org/wiki/Resource_Description_Framework) Documents on [Solid](https://solidproject.org) Pods.

One challenge when writing Solid apps is to make sure that the [Documents](https://solidproject.org/for-developers/apps/first-app/2-understanding-solid) you need actually exist before reading from or writing to them. For example, if you want to [track notes](https://solidproject.org/for-developers/apps/first-app/4-data-model), you will have to check whether a notes Document can be found from the user's Public Type Index, and if it is not present yet, you will have to create one first.

Plandoc makes this a breeze: you describe the expected route to a Document once, and then call a single function to initialise that Document and all the Documents required to get to it.

Plandoc wraps and exposes [Tripledoc](https://vincenttunru.gitlab.io/tripledoc/), and works well in combination with the package [rdf-namespaces](https://www.npmjs.com/package/rdf-namespaces).

## Installation

```bash
npm install plandoc solid-auth-client
```

## Usage

```typescript
import { fetchDocument, describeSubject, describeDocument } from "plandoc";
import { solid } from "rdf-namespaces";

const profile = describeSubject()
  .isFoundAt("https://vincentt.inrupt.net/profile/card#me");

const publicTypeIndex = describeDocument()
  .isFoundOn(profile, solid.publicTypeIndex);

async function fetchPublicTypeIndex() {
  const pti = await fetchDocument(publicTypeIndex);

  /* Do things with the public type index */
}

const notesTypeRegistration = describeSubject()
  .isEnsuredIn(publicTypeIndex)
  .withRef(rdf.type, solid.TypeRegistration)
  .withRef(solid.forClass, schema.TextDigitalDocument); 

const storage = describeContainer()
  .isFoundOn(profile, space.storage);

const notesDocument = describeDocument()
  .isEnsuredOn(notesTypeRegistration, solid.instance, storage);

async function fetchNotesDocument() {
  const notes = await fetchDocument(notesDocument);

  /*
    Do things with the notes Document.
    Note that if that Document did not exist yet,
    it will be created in the user's storage location,
    and a reference to it will be added to the public
    type index.
    Also note that if the type index was fetched
    before, it will not be fetched again.
   */
}
```

## API

### `fetchDocument(virtualDocument: VirtualDocument)`

The most important function of Plandoc: given a `VirtualDocument` that describes the route to a certain Document, `fetchDocument` performs the necessary HTTP requests to retrieve and initialise that Document.

#### Parameter: `virtualDocument`

A description of the route to the desired Document, created through [`describeDocument`](#describedocument).

#### Returns

The desired [TripleDocument](https://vincenttunru.gitlab.io/tripledoc/docs/api/interfaces/tripledocument.html), or `null` if it could not be found. An error will be thrown if something went wrong during the initialisation, such as insufficient permissions.

### `describeDocument()`

Used to describe the route to a certain Document.

```typescript
import { describeDocument } from "plandoc";
import { solid } from "rdf-namespaces";

// When you know the IRI of the Document:
describeDocument().isFoundAt("https://vincentt.inrupt.net/profile/card");

// When a given Subject (`subject`, described by a VirtualSubject) should contain a specific
// Predicate that refers to the desired Document. If it does not, this will result in null:
describeDocument.isFoundOn(subject, solid.publicTypeIndex);

// When a given Subject (`subject`, described by a VirtualSubject) should contain a specific
// Predicate that refers to the desired Document. If it does not, the Document will be created in
// the given Container (`container`, described by a VirtualContainer) and added to that Subject when
// part of a fetched route:
describeDocument.isEnsuredOn(subject, solid.publicTypeIndex, container);
```

### `describeSubject()`

Used to describe the route to a certain Subject. This is primarily useful if this Subject is part of [the route to a Document](#describedocument).

```typescript
import { describeSubject } from "plandoc";
import { vcard, rdf, solid } from "rdf-namespaces";

// When you know the IRI of the Subject:
describeSubject().isFoundAt("https://vincentt.inrupt.net/profile/card#me");

// When a given Subject (`subject`, described by a VirtualSubject) should contain a specific
// Predicate that refers to the desired Subject. If it does not, this will result in null:
describeSubject.isFoundOn(subject, vcard.hasAddress);

// When a given Subject (`subject`, described by a VirtualSubject) should contain a specific
// Predicate that refers to the desired Subject. If it does not, the Subject will be created in the
// same Document as the source Subject, to which a reference will be added, when part of a fetched
// route:
describeSubject.isEnsuredOn(subject, vcard.hasAddress);

// When a given Document (`document`, described by a VirtualDocument) should contain a Subject with
// one or more given properties. If it does not, this will result in null:
describeSubject
  .isFoundIn(document)
  .withRef(rdf.type, solid.TypeRegistration)
  .withRef(solid.forClass, "http://www.w3.org/2002/01/bookmark#Bookmark");

// When a given Document (`document`, described by a VirtualDocument) should contain a Subject with
// one or more given properties. If it does not, the Subject will then be created in that Document
// with the given Predicates, when part of a fetched route:
describeSubject
  .isEnsuredIn(document)
  .withRef(rdf.type, solid.TypeRegistration)
  .withRef(solid.forClass, "http://www.w3.org/2002/01/bookmark#Bookmark");
```

### `describeContainer()`

Used to describe the route to a certain Container. This is primarily useful if this Container is part of [the route to a Document](#describedocument).

```typescript
import { describeContainer } from "plandoc";
import { space } from "rdf-namespaces";

// When a given Subject (`subject`, described by a VirtualSubject) should contain a specific
// Predicate that refers to the desired Container. If it does not, this will result in null:
describeContainer.isFoundOn(subject, space.storage);
```

## Changelog

See [CHANGELOG](https://gitlab.com/vincenttunru/plandoc/blob/master/CHANGELOG.md).

## License

MIT © [Inrupt](https://inrupt.com)
