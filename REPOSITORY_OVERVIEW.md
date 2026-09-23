# Repository overview

This repository contains two independently published Homebridge plugins for Hatch sound machines:

- `packages/homebridge-hatch-baby-rest` (`homebridge-hatch-baby-rest`) supports Wi-Fi Hatch Rest and Restore models.
- `packages/homebridge-hatch-rest-bluetooth` (`homebridge-hatch-rest-bluetooth`) supports the original Bluetooth Rest model.

## Layout

- `packages/homebridge-hatch-baby-rest/src` and `packages/homebridge-hatch-rest-bluetooth/src` contain plugin source; each package's `test` directory contains its Vitest tests.
- `packages/shared` contains shared TypeScript utilities and tests.
- `packages/tsconfig` provides the shared TypeScript configuration and `packages/examples` contains local usage examples.
- `package.json`, `turbo.json`, and `package-lock.json` define the npm workspace, task orchestration, and dependency lockfile.
- `.github/workflows/nodejs.yml` runs build, test, and lint checks on Node 20, 22, and 24. `.github/workflows/release.yml` publishes through Changesets after pushes to `main`.

## Common commands

Run `npm ci` to install the locked workspace dependencies, then use `npm run build`, `npm test`, or `npm run lint`. Turbo runs each command in the packages that define the corresponding script.

## Release workflow

Add a Changeset file under `.changeset/` describing package version bumps and the release note. The `version` script applies pending Changesets and updates package changelogs; the release workflow opens the release pull request and publishes after it is merged. Keep dependency-only changes as patch releases for both published plugin packages unless runtime behavior requires otherwise.
