# Changelog

## [1.1.1](https://github.com/ipsec-dev/Article30/compare/v1.1.0...v1.1.1) (2026-05-12)


### Maintenance & Dependencies

* **deps:** bump next from 16.2.4 to 16.2.6 ([#48](https://github.com/ipsec-dev/Article30/issues/48)) ([7212161](https://github.com/ipsec-dev/Article30/commit/72121614c9b828ec04b01302b8797bb87c19b3d4))
* **deps:** bump the production-deps group with 3 updates ([#49](https://github.com/ipsec-dev/Article30/issues/49)) ([e7d6678](https://github.com/ipsec-dev/Article30/commit/e7d667888308dc7646a31aa61fb5af10d3603b41))
* **deps-dev:** bump the dev-deps group with 6 updates ([#50](https://github.com/ipsec-dev/Article30/issues/50)) ([9d87038](https://github.com/ipsec-dev/Article30/commit/9d870385a8c32069098f601a292cc219bb09b921))
* **deps-dev:** bump @commitlint/config-conventional ([#51](https://github.com/ipsec-dev/Article30/issues/51)) ([c6bbebf](https://github.com/ipsec-dev/Article30/commit/c6bbebf46f8b2cc10b475d07918fe9a586ab77ac))
* **deps-dev:** bump @commitlint/cli from 20.5.3 to 21.0.0 ([#52](https://github.com/ipsec-dev/Article30/issues/52)) ([f9e8f1e](https://github.com/ipsec-dev/Article30/commit/f9e8f1e2ea16ee2ff85570c5bd5fee70acb23244))
* **deps-dev:** align @commitlint/config-conventional with lockfile ([#52](https://github.com/ipsec-dev/Article30/issues/52)) ([f9e8f1e](https://github.com/ipsec-dev/Article30/commit/f9e8f1e2ea16ee2ff85570c5bd5fee70acb23244))
* **ci:** impact-weighted prefixes for dependabot commits ([#55](https://github.com/ipsec-dev/Article30/issues/55)) ([2874df7](https://github.com/ipsec-dev/Article30/commit/2874df7ec3d96acce52690a9c4925fa4417f0275))
* **ci:** pin archiver at v7 until @types/archiver@8 ships ([#56](https://github.com/ipsec-dev/Article30/issues/56)) ([500f576](https://github.com/ipsec-dev/Article30/commit/500f5762bf4a98366b2bf67a910bfcb0198327d2))
* extend lint-staged glob to cover yml and yaml ([#57](https://github.com/ipsec-dev/Article30/issues/57)) ([d118daf](https://github.com/ipsec-dev/Article30/commit/d118daf97bc934c28598c6259ef3d3dd24d3a95a))

## [1.1.0](https://github.com/ipsec-dev/Article30/compare/v1.0.2...v1.1.0) (2026-05-11)


### Features

* **shared:** add DOCUMENT_READ_ROLES constant and docs.read capability ([#46](https://github.com/ipsec-dev/Article30/issues/46)) ([4ad9403](https://github.com/ipsec-dev/Article30/commit/4ad94036b6e6f3e2cea0e878a94c0588f7f33aa0))
* **storage:** add getObject streaming primitive with Range support ([#46](https://github.com/ipsec-dev/Article30/issues/46)) ([4ad9403](https://github.com/ipsec-dev/Article30/commit/4ad94036b6e6f3e2cea0e878a94c0588f7f33aa0))
* **authorization:** per-entity read helpers for documents and follow-up attachments ([#46](https://github.com/ipsec-dev/Article30/issues/46)) ([4ad9403](https://github.com/ipsec-dev/Article30/commit/4ad94036b6e6f3e2cea0e878a94c0588f7f33aa0))
* **documents:** stream document and attachment downloads with ownership checks ([#46](https://github.com/ipsec-dev/Article30/issues/46)) ([4ad9403](https://github.com/ipsec-dev/Article30/commit/4ad94036b6e6f3e2cea0e878a94c0588f7f33aa0))
* **frontend:** open documents via same-origin proxy URL directly ([#46](https://github.com/ipsec-dev/Article30/issues/46)) ([4ad9403](https://github.com/ipsec-dev/Article30/commit/4ad94036b6e6f3e2cea0e878a94c0588f7f33aa0))

### Bug Fixes

* **frontend:** force download via anchor download attribute instead of new tab ([#46](https://github.com/ipsec-dev/Article30/issues/46)) ([4ad9403](https://github.com/ipsec-dev/Article30/commit/4ad94036b6e6f3e2cea0e878a94c0588f7f33aa0))

## [1.0.2](https://github.com/ipsec-dev/Article30/compare/v1.0.1...v1.0.2) (2026-05-09)


### Maintenance & Dependencies

* **deps:** bump the production-deps group with 2 updates ([#42](https://github.com/ipsec-dev/Article30/issues/42)) ([742be24](https://github.com/ipsec-dev/Article30/commit/742be24e23f50e244b72583ab4370012ebf24ca2))
* **ci:** bump codecov/codecov-action from 5.5.4 to 6.0.0 ([#39](https://github.com/ipsec-dev/Article30/issues/39)) ([04dbecb](https://github.com/ipsec-dev/Article30/commit/04dbecbe6d562e01698ca9d01c4d842f7bd0e38f))
* **ci:** bump actions/create-github-app-token from 2 to 3 ([#40](https://github.com/ipsec-dev/Article30/issues/40)) ([824b0b9](https://github.com/ipsec-dev/Article30/commit/824b0b911a95071a411d7b605a969a56b96e3df6))
* **ci:** bump dorny/paths-filter from 3.0.3 to 4.0.1 ([#41](https://github.com/ipsec-dev/Article30/issues/41)) ([04b611c](https://github.com/ipsec-dev/Article30/commit/04b611c79c5a2fda54308c0b83598975294e9799))
* **deps-dev:** bump lint-staged from 16.4.0 to 17.0.2 ([#43](https://github.com/ipsec-dev/Article30/issues/43)) ([1e35bb2](https://github.com/ipsec-dev/Article30/commit/1e35bb2c50b65ce84fd92b1d69b1f6331cdfcd5a))

## [1.0.1](https://github.com/ipsec-dev/Article30/compare/v1.0.0...v1.0.1) (2026-05-09)


### Maintenance & Dependencies

* restore work on top of v1.0.0 baseline ([#37](https://github.com/ipsec-dev/Article30/issues/37)) ([2871ca6](https://github.com/ipsec-dev/Article30/commit/2871ca639a720d793cc6bef7699aa53f181ae1b2))

## [1.0.0] - 2026-05-07

Initial public release. See the [v1.0.0 GitHub Release](https://github.com/ipsec-dev/Article30/releases/tag/v1.0.0).

[1.0.0]: https://github.com/ipsec-dev/Article30/releases/tag/v1.0.0
