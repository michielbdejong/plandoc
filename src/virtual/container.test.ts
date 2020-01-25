import { describeContainer } from "../virtual/container";

it("should be able to create a configuration object that specificies a combination of ACL rules", () => {
  const parentContainer = describeContainer().isFoundAt(
    "https://arbitrary.pod/container/"
  );

  const configuration = describeContainer()
    .experimental_isContainedIn(parentContainer, "child-container")
    .experimental_isReadableByEveryone()
    .experimental_isAppendableByAgent("https://some.pod/webid.ttl")
    .experimental_isControllableByOrigin(
      "https://some.app",
      "https://some.pod/webid.ttl"
    );

  expect(configuration.internal_descriptor.acl).toEqual({
    public: {
      read: true
    },
    agents: {
      "https://some.pod/webid.ttl": { append: true }
    },
    origins: {
      "https://some.app": {
        "https://some.pod/webid.ttl": { control: true }
      }
    }
  });
});

it("should intialise the ACL configuration object if it is inadvertently undefined", () => {
  const parentContainer = describeContainer().isFoundAt(
    "https://arbitrary.pod/container/"
  );

  const incompleteConfiguration = describeContainer().experimental_isContainedIn(
    parentContainer,
    "child-container"
  );
  // Obviously people should never do this, but in case they do:
  delete incompleteConfiguration.internal_descriptor.acl;

  const completePublicConfiguration = incompleteConfiguration.experimental_isReadableByEveryone();

  const completeAgentConfiguration = incompleteConfiguration.experimental_isAppendableByAgent(
    "https://some.pod/webid.ttl"
  );

  const completeOriginConfiguration = incompleteConfiguration.experimental_isControllableByOrigin(
    "https://some.app",
    "https://some.pod/webid.ttl"
  );

  expect(completePublicConfiguration.internal_descriptor.acl).toEqual({
    public: {
      read: true
    }
  });
  expect(completeAgentConfiguration.internal_descriptor.acl).toEqual({
    agents: {
      "https://some.pod/webid.ttl": { append: true }
    }
  });
  expect(completeOriginConfiguration.internal_descriptor.acl).toEqual({
    origins: {
      "https://some.app": {
        "https://some.pod/webid.ttl": { control: true }
      }
    }
  });
});

describe("Configuring public ACL settings", () => {
  it("should be able to create a configuration object that specificies public Read permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isReadableByEveryone();

    expect(configuration.internal_descriptor.acl).toEqual({
      public: { read: true }
    });
  });

  it("should be able to create a configuration object that specificies public Append permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isAppendableByEveryone();

    expect(configuration.internal_descriptor.acl).toEqual({
      public: { append: true }
    });
  });

  it("should be able to create a configuration object that specificies public Write permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isWritableByEveryone();

    expect(configuration.internal_descriptor.acl).toEqual({
      public: { write: true }
    });
  });

  it("should be able to create a configuration object that specificies public Control permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isControllableByEveryone();

    expect(configuration.internal_descriptor.acl).toEqual({
      public: { control: true }
    });
  });

  it("should be able to create a configuration object that specificies a combination of public permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isWritableByEveryone()
      .experimental_isControllableByEveryone();

    expect(configuration.internal_descriptor.acl).toEqual({
      public: { write: true, control: true }
    });
  });
});

describe("Configuring agent-specific ACL settings", () => {
  it("should be able to create a configuration object that specificies agent-specific Read permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isReadableByAgent("https://some.pod/webid.ttl");

    expect(configuration.internal_descriptor.acl).toEqual({
      agents: { "https://some.pod/webid.ttl": { read: true } }
    });
  });

  it("should be able to create a configuration object that specificies agent-specific Append permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isAppendableByAgent("https://some.pod/webid.ttl");

    expect(configuration.internal_descriptor.acl).toEqual({
      agents: { "https://some.pod/webid.ttl": { append: true } }
    });
  });

  it("should be able to create a configuration object that specificies agent-specific Write permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isWritableByAgent("https://some.pod/webid.ttl");

    expect(configuration.internal_descriptor.acl).toEqual({
      agents: { "https://some.pod/webid.ttl": { write: true } }
    });
  });

  it("should be able to create a configuration object that specificies agent-specific Control permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isControllableByAgent("https://some.pod/webid.ttl");

    expect(configuration.internal_descriptor.acl).toEqual({
      agents: { "https://some.pod/webid.ttl": { control: true } }
    });
  });

  it("should be able to create a configuration object that specificies a combination of agent-specific permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isWritableByAgent("https://some.pod/webid.ttl")
      .experimental_isControllableByAgent("https://some.pod/webid.ttl");

    expect(configuration.internal_descriptor.acl).toEqual({
      agents: { "https://some.pod/webid.ttl": { write: true, control: true } }
    });
  });

  it("should be able to create a configuration object that specificies agent-specific permissions for different agents", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isReadableByAgent("https://some.pod/webid.ttl")
      .experimental_isAppendableByAgent("https://some-other.pod/webid.ttl");

    expect(configuration.internal_descriptor.acl).toEqual({
      agents: {
        "https://some.pod/webid.ttl": { read: true },
        "https://some-other.pod/webid.ttl": { append: true }
      }
    });
  });
});

describe("Configuring origin-specific ACL settings", () => {
  it("should be able to create a configuration object that specificies origin-specific Read permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isReadableByOrigin(
        "https://some.app",
        "https://some.pod/webid.ttl"
      );

    expect(configuration.internal_descriptor.acl).toEqual({
      origins: {
        "https://some.app": { "https://some.pod/webid.ttl": { read: true } }
      }
    });
  });

  it("should be able to create a configuration object that specificies origin-specific Append permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isAppendableByOrigin(
        "https://some.app",
        "https://some.pod/webid.ttl"
      );

    expect(configuration.internal_descriptor.acl).toEqual({
      origins: {
        "https://some.app": { "https://some.pod/webid.ttl": { append: true } }
      }
    });
  });

  it("should be able to create a configuration object that specificies origin-specific Write permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isWritableByOrigin(
        "https://some.app",
        "https://some.pod/webid.ttl"
      );

    expect(configuration.internal_descriptor.acl).toEqual({
      origins: {
        "https://some.app": { "https://some.pod/webid.ttl": { write: true } }
      }
    });
  });

  it("should be able to create a configuration object that specificies origin-specific Control permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isControllableByOrigin(
        "https://some.app",
        "https://some.pod/webid.ttl"
      );

    expect(configuration.internal_descriptor.acl).toEqual({
      origins: {
        "https://some.app": { "https://some.pod/webid.ttl": { control: true } }
      }
    });
  });

  it("should be able to create a configuration object that specificies a combination of origin-specific permissions", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isReadableByOrigin(
        "https://some.app",
        "https://some.pod/webid.ttl"
      )
      .experimental_isControllableByOrigin(
        "https://some.app",
        "https://some.pod/webid.ttl"
      );

    expect(configuration.internal_descriptor.acl).toEqual({
      origins: {
        "https://some.app": {
          "https://some.pod/webid.ttl": { read: true, control: true }
        }
      }
    });
  });

  it("should be able to create a configuration object that specificies a origin-specific permissions for different origins", () => {
    const parentContainer = describeContainer().isFoundAt(
      "https://arbitrary.pod/container/"
    );

    const configuration = describeContainer()
      .experimental_isContainedIn(parentContainer, "child-container")
      .experimental_isReadableByOrigin(
        "https://some.app",
        "https://some.pod/webid.ttl"
      )
      .experimental_isAppendableByOrigin(
        "https://some.app",
        "https://some.pod/other-webid.ttl"
      )
      .experimental_isControllableByOrigin(
        "https://some-other.app",
        "https://some.pod/webid.ttl"
      );

    expect(configuration.internal_descriptor.acl).toEqual({
      origins: {
        "https://some.app": {
          "https://some.pod/webid.ttl": { read: true },
          "https://some.pod/other-webid.ttl": { append: true }
        },
        "https://some-other.app": {
          "https://some.pod/webid.ttl": { control: true }
        }
      }
    });
  });
});
