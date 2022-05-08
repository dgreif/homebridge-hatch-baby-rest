# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [3.3.0](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v3.2.5...v3.3.0) (2022-05-08)


### Features

* rest 2nd gen support ([ea30705](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/ea307057b14ac0f3b115901129fac5fe6f7e5a4c))


### Bug Fixes

* log unsupported products ([1d093cb](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/1d093cb9b99e53ac706b2b2d385d8eb88ef188ea))
* update dependencies ([c1d5073](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/c1d507300bba4a47fa41fef701082aaa74c88858))
* update dependencies ([0f29b3d](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/0f29b3dea167ddcf5dd7170c7dbf27b2abe4f2af))

## [3.3.0-beta.1](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v3.3.0-beta.0...v3.3.0-beta.1) (2021-12-27)

## [3.3.0-beta.0](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v3.2.5...v3.3.0-beta.0) (2021-12-26)


### Features

* rest 2nd gen support ([efdf49d](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/efdf49d0e75a386eb1908d94079bc2bb7ea0daba))

### [3.2.5](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v3.2.4...v3.2.5) (2021-11-27)


### Bug Fixes

* update dependencies ([a1c7d07](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/a1c7d07963369f725ad7f4086c62243fbd92e938))

### [3.2.4](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v3.2.3...v3.2.4) (2021-09-18)


### Bug Fixes

* connect with aws iot before returning devices ([2370896](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/237089636a1988284b10caf24b6cf5625f0efeb3)), closes [#61](https://github.com/dgreif/homebridge-hatch-baby-rest/issues/61)
* correct rounding for percentage conversion ([85f8013](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/85f801334e69d961cd34033c0bd74b2a5b0d9059))
* refresh iot client every 8 hours ([1f114a5](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/1f114a5c918e2a93ed0514333a0078a8a462e549)), closes [#59](https://github.com/dgreif/homebridge-hatch-baby-rest/issues/59)
* typo in homebridge logs ([3b0f0c1](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/3b0f0c1be3ee2a3a12d7a2104282935c1bfecc8c))
* update dependencies ([979cdc7](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/979cdc71122ca631e11102888e9ce4fb517bf0aa))

### [3.2.3](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v3.2.2...v3.2.3) (2021-08-15)


### Bug Fixes

* update dependencies ([4eee7e4](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/4eee7e452f20362c904eee68c25083ba95bbc405))

### [3.2.2](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v3.2.1...v3.2.2) (2021-05-17)

### [3.2.1](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v3.2.0...v3.2.1) (2021-05-17)


### Bug Fixes

* update dependencies ([2bd1414](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/2bd141413c459eaa0e8ec66cbf856cf2c588bdfc))

## [3.2.0](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v3.1.0...v3.2.0) (2021-04-10)


### Features

* hatch restore support ([d22cdfa](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/d22cdfae21dc076af9df3060439a2e96dbb6e4c9)), closes [#32](https://github.com/dgreif/homebridge-hatch-baby-rest/issues/32)


### Bug Fixes

* update dependencies ([1da2c1d](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/1da2c1d910068e253f66b2861462689def39d342))

## [3.1.0](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v3.0.0...v3.1.0) (2021-03-06)


### Features

* rest mini support ([705da04](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/705da043dd5fb3def2ef24559535b963783e306a))


### Bug Fixes

* **rest+:** handle "no color" selection from hatch app ([b1a8014](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/b1a801464419c47ee2608633c9209ea80902a879)), closes [#45](https://github.com/dgreif/homebridge-hatch-baby-rest/issues/45)
* update dependencies ([9106508](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/9106508a4cd5426208fdf8d4af15b5e947df62cb))

## [3.0.0](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v2.2.1...v3.0.0) (2021-02-06)


### ⚠ BREAKING CHANGES

* v3 includes a number of breaking changes.  Please see https://github.com/dgreif/homebridge-hatch-baby-rest/wiki/Upgrading-from-v2-to-v3 for details

### Features

* unified platform config for rest and rest+ ([8902516](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/89025164d36eefcc0f97572a652f302728d46e3d))
* **rest:** separate power, light and sound accessories ([f3ddba2](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/f3ddba261658209c0ca98166d5296da123a6802a))
* **rest+:** separate power, light and sound accessories ([55617e5](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/55617e5c78565c6068143fdb7b34401c42dceb70))


### Bug Fixes

* automatically migrate rest accessories to platform ([d82ad32](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/d82ad32ca6623300fae137a75dbc6c5bd17c4b40))

### [2.2.1](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v2.2.0...v2.2.1) (2021-01-29)

## [2.2.0](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v2.1.0...v2.2.0) (2021-01-29)


### Features

* use mac address as serial number ([a7ee3f6](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/a7ee3f601bb20e351aa12d6eafbcb64e07fbc998)), closes [#42](https://github.com/dgreif/homebridge-hatch-baby-rest/issues/42)

## [2.1.0](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v2.0.5...v2.1.0) (2020-11-14)


### Features

* **rest+:** `alwaysRainbow` option ([016bcac](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/016bcac7339b13762ef67f9c4113e0dec7aed8bb))


### Bug Fixes

* **rest+:** handle update requests serially ([f08f2b9](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/f08f2b9e76f73075546420cffce2b31d3c900078))
* only allow rest+ via platform ([de0e4f1](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/de0e4f1e6adfc83a33c21dc7163bbaa560cbc7e8)), closes [#32](https://github.com/dgreif/homebridge-hatch-baby-rest/issues/32)
* only apply state updates to target device ([7635d32](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/7635d32f662a508e97a647fcd2726b79545ba4a0)), closes [#28](https://github.com/dgreif/homebridge-hatch-baby-rest/issues/28)

### [2.0.5](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v2.0.4...v2.0.5) (2020-09-13)

### [2.0.4](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v2.0.3...v2.0.4) (2020-06-05)

### [2.0.3](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v2.0.2...v2.0.3) (2020-06-02)


### Bug Fixes

* create new mqtt client when auth expires ([65d0f33](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/65d0f33ae62ef434daa9160451ede8b53102e226)), closes [#8](https://github.com/dgreif/homebridge-hatch-baby-rest/issues/8)

### [2.0.2](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v2.0.1...v2.0.2) (2020-05-12)

### [2.0.1](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v2.0.0...v2.0.1) (2020-04-08)


### Bug Fixes

* prevent noble from loading if not used ([71deda8](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/71deda858423185f24d04e8434811214cb16105e)), closes [#12](https://github.com/dgreif/homebridge-hatch-baby-rest/issues/12)

## [2.0.0](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v1.3.1...v2.0.0) (2020-04-05)


### ⚠ BREAKING CHANGES

* Node 10+ now required

### Features

* add `showAsSwitch` option to hbr accessory ([0f83328](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/0f833281ae06f50f031343dcae135bc4c53fd720)), closes [#11](https://github.com/dgreif/homebridge-hatch-baby-rest/issues/11)


* update minimum node version to 10 ([ea1837e](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/ea1837e031f2324bc82b6e92fc47aafe70441351))

### [1.3.1](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v1.3.0...v1.3.1) (2020-02-29)


### Bug Fixes

* allow rest+ lights to be removed with `removeAll` ([ed0b01e](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/ed0b01ebf94e41fb49f816a14a237f0474fc1d55))

## [1.3.0](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v1.2.0...v1.3.0) (2020-02-27)


### Features

* color picker for hbr+ ([4855330](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/48553302174b77c8a6152d69f7eca07ee60156a8))

## [1.2.0](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v1.1.8...v1.2.0) (2020-01-06)


### Features

* hatch baby rest+ support ([bc808b3](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/bc808b3f3943e6644b0c401944ae017a7f891ff0)), closes [#1](https://github.com/dgreif/homebridge-hatch-baby-rest/issues/1)

### [1.1.8](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v1.1.7...v1.1.8) (2019-12-18)


### Bug Fixes

* **osx:** assume correct device if address is unknown ([1c892c5](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/1c892c5bcce13332dc215ed855a210ff23505b14)), closes [#4](https://github.com/dgreif/homebridge-hatch-baby-rest/issues/4)

### [1.1.7](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v1.1.6...v1.1.7) (2019-10-05)


### Bug Fixes

* remove initial connect call ([412f028](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/412f028))

### [1.1.6](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v1.1.5...v1.1.6) (2019-10-05)


### Bug Fixes

* revert reconnect logic ([27c3c10](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/27c3c10))
* throw error when service or characteristic is not found ([b50148d](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/b50148d))

### [1.1.5](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v1.1.4...v1.1.5) (2019-09-29)


### Bug Fixes

* add back reconnect logic ([a8a2e23](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/a8a2e23))

### [1.1.4](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v1.1.3...v1.1.4) (2019-09-26)


### Bug Fixes

* only connect while interacting ([7d06388](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/7d06388))

### [1.1.3](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v1.1.2...v1.1.3) (2019-09-26)


### Bug Fixes

* strip mac address and service ids for cross platform compatibility ([7eefc38](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/7eefc38))

### [1.1.2](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v1.1.1...v1.1.2) (2019-09-26)

### [1.1.1](https://github.com/dgreif/homebridge-hatch-baby-rest/compare/v1.1.0...v1.1.1) (2019-09-25)

## 1.1.0 (2019-09-25)


### Features

* hatch baby rest homebridge plugin ([956c56f](https://github.com/dgreif/homebridge-hatch-baby-rest/commit/956c56f))
