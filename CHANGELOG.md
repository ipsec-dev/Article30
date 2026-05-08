# Changelog

## [2.1.0](https://github.com/ipsec-dev/Article30/compare/v2.0.3...v2.1.0) (2026-05-08)


### Features

* **ops:** publish backend-tools admin image ([#32](https://github.com/ipsec-dev/Article30/issues/32)) ([35c5a44](https://github.com/ipsec-dev/Article30/commit/35c5a445c1bd1594a671dfab0926da8f698ef30a))

### Maintenance & Dependencies

* **backend:** document seed contract and add prod guard ([#31](https://github.com/ipsec-dev/Article30/issues/31)) ([cb9a8d7](https://github.com/ipsec-dev/Article30/commit/cb9a8d763f676294f39f4a3a7cdbf11ea81ab06f))

### Build System

* **backend:** add tools image stage for admin scripts ([#31](https://github.com/ipsec-dev/Article30/issues/31)) ([cb9a8d7](https://github.com/ipsec-dev/Article30/commit/cb9a8d763f676294f39f4a3a7cdbf11ea81ab06f))
* **compose:** add backend-tools admin-profile service ([#31](https://github.com/ipsec-dev/Article30/issues/31)) ([cb9a8d7](https://github.com/ipsec-dev/Article30/commit/cb9a8d763f676294f39f4a3a7cdbf11ea81ab06f))

## [2.0.3](https://github.com/ipsec-dev/Article30/compare/v2.0.2...v2.0.3) (2026-05-08)


### Bug Fixes

* **backend:** include prisma.config.ts and runtime deps in prod image ([#28](https://github.com/ipsec-dev/Article30/issues/28)) ([3e97906](https://github.com/ipsec-dev/Article30/commit/3e979064681274748d4d4b43f09243f4c3c4b232))

## [2.0.2](https://github.com/ipsec-dev/Article30/compare/v2.0.1...v2.0.2) (2026-05-08)


### Bug Fixes

* **organization:** allow saving annualTurnover by handling BigInt at the boundaries ([#26](https://github.com/ipsec-dev/Article30/issues/26)) ([aa0775e](https://github.com/ipsec-dev/Article30/commit/aa0775e9eb8fefef47d0299fcb356d5fc6822374))
* **frontend:** reveal page title and description under mobile top bar ([#25](https://github.com/ipsec-dev/Article30/issues/25)) ([55c36f0](https://github.com/ipsec-dev/Article30/commit/55c36f02c64e5726fca1b0aa0d3bab28070a1f8a))
* **frontend:** add accessible names to icon-only buttons ([#25](https://github.com/ipsec-dev/Article30/issues/25)) ([55c36f0](https://github.com/ipsec-dev/Article30/commit/55c36f02c64e5726fca1b0aa0d3bab28070a1f8a))
* **frontend:** restore spacing between auth form fields and submit button ([#25](https://github.com/ipsec-dev/Article30/issues/25)) ([55c36f0](https://github.com/ipsec-dev/Article30/commit/55c36f02c64e5726fca1b0aa0d3bab28070a1f8a))

### Maintenance & Dependencies

* **i18n:** shorten navbar labels for ISO and regulatory watch ([#25](https://github.com/ipsec-dev/Article30/issues/25)) ([55c36f0](https://github.com/ipsec-dev/Article30/commit/55c36f02c64e5726fca1b0aa0d3bab28070a1f8a))

## [2.0.1](https://github.com/ipsec-dev/Article30/compare/v2.0.0...v2.0.1) (2026-05-08)


### Performance Improvements

* slim backend prod image and stop leaking X-Powered-By ([#22](https://github.com/ipsec-dev/Article30/issues/22)) ([c75ad68](https://github.com/ipsec-dev/Article30/commit/c75ad68838924af41b77cfd7a3f43a54d9198131))

## [2.0.0](https://github.com/ipsec-dev/Article30/compare/v1.0.2...v2.0.0) (2026-05-08)


### ⚠ BREAKING CHANGES

* switch prod deploy to GHCR-pull canonical path ([#18](https://github.com/ipsec-dev/Article30/issues/18))

### Maintenance & Dependencies

* switch prod deploy to GHCR-pull canonical path ([#18](https://github.com/ipsec-dev/Article30/issues/18)) ([7cf034a](https://github.com/ipsec-dev/Article30/commit/7cf034a37d1919235c1bb72c767d86a371fe5ee7))

## [1.0.2](https://github.com/ipsec-dev/Article30/compare/v1.0.1...v1.0.2) (2026-05-08)


### Maintenance & Dependencies

* clean up CodeQL Quality findings ([#16](https://github.com/ipsec-dev/Article30/issues/16)) ([5a13f2f](https://github.com/ipsec-dev/Article30/commit/5a13f2ff2c0f76714de89286df7bb7610ea6ec42))

## [1.0.1](https://github.com/ipsec-dev/Article30/compare/v1.0.0...v1.0.1) (2026-05-08)


### Maintenance & Dependencies

* **ci:** bump docker/login-action from 3 to 4 ([#6](https://github.com/ipsec-dev/Article30/issues/6)) ([468edc0](https://github.com/ipsec-dev/Article30/commit/468edc04e8c4e55eb98f40ef0908a412c64facd9))
* **ci:** bump docker/metadata-action from 5 to 6 ([#3](https://github.com/ipsec-dev/Article30/issues/3)) ([da8b54f](https://github.com/ipsec-dev/Article30/commit/da8b54fa46f06e4d2a44114d03814517ff08ff48))
* **ci:** bump docker/setup-qemu-action from 3 to 4 ([#5](https://github.com/ipsec-dev/Article30/issues/5)) ([6d5abc4](https://github.com/ipsec-dev/Article30/commit/6d5abc42b1a210eaa7d60cdf933b6dbe61efaa6c))
* **ci:** bump googleapis/release-please-action from 4 to 5 ([#4](https://github.com/ipsec-dev/Article30/issues/4)) ([fc1918e](https://github.com/ipsec-dev/Article30/commit/fc1918e83d64b38469faa44f4074fe702b7fc0bb))
* **deps-dev:** bump @commitlint/cli from 19.8.1 to 20.5.3 ([#9](https://github.com/ipsec-dev/Article30/issues/9)) ([56b8386](https://github.com/ipsec-dev/Article30/commit/56b8386d779c59b5591dd741f80def01f25dce29))
* **deps-dev:** bump @commitlint/config-conventional ([#10](https://github.com/ipsec-dev/Article30/issues/10)) ([abedd59](https://github.com/ipsec-dev/Article30/commit/abedd59f6454c1bc7bbb7fa967ed89d170c29db2))
* **deps-dev:** bump typescript-eslint in the dev-deps group ([#8](https://github.com/ipsec-dev/Article30/issues/8)) ([f0e83fc](https://github.com/ipsec-dev/Article30/commit/f0e83fc6386a960e3398e8abe985048655629abc))
* **deps:** bump the production-deps group with 2 updates ([#7](https://github.com/ipsec-dev/Article30/issues/7)) ([19bf205](https://github.com/ipsec-dev/Article30/commit/19bf20535ab31fc0386818a6f340cf37703eae44))
* initial public release (v1.0.0) ([#2](https://github.com/ipsec-dev/Article30/issues/2)) ([5003b57](https://github.com/ipsec-dev/Article30/commit/5003b57e3d8b39e08ce74b2c25ea6b76571560b9))
* post-init cleanup (commitlint relax + release-please changelog sections) ([#11](https://github.com/ipsec-dev/Article30/issues/11)) ([4cb5f66](https://github.com/ipsec-dev/Article30/commit/4cb5f66c2770741630e4fddb7072279e7c00c9a6))

## [1.0.0] - 2026-05-07

Initial public release. See the [v1.0.0 GitHub Release](https://github.com/ipsec-dev/Article30/releases/tag/v1.0.0).

[1.0.0]: https://github.com/ipsec-dev/Article30/releases/tag/v1.0.0
