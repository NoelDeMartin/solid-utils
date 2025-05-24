# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.6.1](https://github.com/NoelDeMartin/solid-utils/releases/tag/v0.6.1) - 2025-05-24

### Added

- `normalizeJsonLD` helper.

## [v0.6.0](https://github.com/NoelDeMartin/solid-utils/releases/tag/v0.6.0) - 2025-03-31

### Changed

- Modernized tooling, the library is now ESM-only and has been tested with Node 22+.
- Dropped testing utils from main bundle, import them as `@noeldemartin/solid-utils/testing`, `@noeldemartin/solid-utils/vitest`, and `@noeldemartin/solid-utils/chai` instead.
- `installChaiPlugin` has been renamed to `installChaiSolidAssertions`.

## [v0.5.0](https://github.com/NoelDeMartin/solid-utils/releases/tag/v0.5.0) - 2025-01-05

### Added

- `ldp:` prefix.
- `toEqualTurtle` matcher.

### Fixed

- Parsing JsonLD with anonymous subjects (meaning subjects with ids such as `#it`, without a full url).

### Changed

- `@types/rdf-js` dependency for `@rdfjs/types`.
- Many of the `fetch*` helpers now take an options object instead of a `fetch` method.
- Disabled caching when reading user profiles, in order to fix an issue with CSS v7.1.3 (See [CommunitySolidServer/CommunitySolidServer#1972](https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1972)).

### Removed

- Faking helpers have been extracted into `@noeldemartin/testing` in order to avoid including them (and the `faker` dependency) on production bundles.

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
