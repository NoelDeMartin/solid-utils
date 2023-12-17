# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.4.0](https://github.com/NoelDeMartin/solid-utils/releases/tag/v0.4.0) - 2023-12-17

### Changed

- Retrieving user profiles will now fail if no storage urls are found. In reality, this is only an improvement for the TypeScript types since [according to the spec](https://solidproject.org/TR/protocol#storage-resource) this should never happen.

### Deprecated

- Interoperability helpers such as `createPublicTypeIndex`, `createPrivateTypeIndex`, `findContainerRegistrations`, and `findInstanceRegistrations`. Use [soukai-solid interoperability helpers](https://github.com/noeldemartin/soukai-solid#interoperability) instead.

### Removed

- Required jest dependencies. This was previously causing some problems using other test runners like [Vitest](https://vitest.dev/).

## [v0.3.0](https://github.com/NoelDeMartin/solid-utils/releases/tag/v0.3.0) - 2023-03-10

### Fixed

- Tree-shaking by declaring `"sideEffects": false`.

### Changed

- `fetchLoginUserProfile` now takes an options object instead of an optional fetch function.

## [v0.2.0](https://github.com/NoelDeMartin/solid-utils/releases/tag/v0.2.0) - 2023-01-20

### Added

- `rdf:` prefix for `http://www.w3.org/1999/02/22-rdf-syntax-ns#` (previously was `rdfs:`).

### Changed

- The `rdfs:` has been changed to be `http://www.w3.org/2000/01/rdf-schema#`.

## [v0.1.1](https://github.com/NoelDeMartin/solid-utils/releases/tag/v0.1.1) - 2021-09-04

No documented changes.

## [v0.1.0](https://github.com/NoelDeMartin/solid-utils/releases/tag/v0.1.0) - 2021-09-04

### Added

- Everything!
