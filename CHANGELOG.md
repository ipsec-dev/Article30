# Changelog

## [2.0.0](https://github.com/ipsec-dev/Article30/compare/v1.0.0...v2.0.0) (2026-05-09)


### ⚠ BREAKING CHANGES

* switch prod deploy to GHCR-pull canonical path ([#18](https://github.com/ipsec-dev/Article30/issues/18))

### Features

* **ops:** publish backend-tools admin image ([#32](https://github.com/ipsec-dev/Article30/issues/32)) ([35c5a44](https://github.com/ipsec-dev/Article30/commit/35c5a445c1bd1594a671dfab0926da8f698ef30a))


### Bug Fixes

* **backend:** include prisma.config.ts and runtime deps in prod image ([#28](https://github.com/ipsec-dev/Article30/issues/28)) ([3e97906](https://github.com/ipsec-dev/Article30/commit/3e979064681274748d4d4b43f09243f4c3c4b232))
* **organization:** allow saving annualTurnover by handling BigInt at the boundaries ([#26](https://github.com/ipsec-dev/Article30/issues/26)) ([aa0775e](https://github.com/ipsec-dev/Article30/commit/aa0775e9eb8fefef47d0299fcb356d5fc6822374))


### Performance Improvements

* slim backend prod image and stop leaking X-Powered-By ([#22](https://github.com/ipsec-dev/Article30/issues/22)) ([c75ad68](https://github.com/ipsec-dev/Article30/commit/c75ad68838924af41b77cfd7a3f43a54d9198131))


### Maintenance & Dependencies

* **ci:** bump docker/login-action from 3 to 4 ([#6](https://github.com/ipsec-dev/Article30/issues/6)) ([468edc0](https://github.com/ipsec-dev/Article30/commit/468edc04e8c4e55eb98f40ef0908a412c64facd9))
* **ci:** bump docker/metadata-action from 5 to 6 ([#3](https://github.com/ipsec-dev/Article30/issues/3)) ([da8b54f](https://github.com/ipsec-dev/Article30/commit/da8b54fa46f06e4d2a44114d03814517ff08ff48))
* **ci:** bump docker/setup-qemu-action from 3 to 4 ([#5](https://github.com/ipsec-dev/Article30/issues/5)) ([6d5abc4](https://github.com/ipsec-dev/Article30/commit/6d5abc42b1a210eaa7d60cdf933b6dbe61efaa6c))
* **ci:** bump googleapis/release-please-action from 4 to 5 ([#4](https://github.com/ipsec-dev/Article30/issues/4)) ([fc1918e](https://github.com/ipsec-dev/Article30/commit/fc1918e83d64b38469faa44f4074fe702b7fc0bb))
* clean up CodeQL Quality findings ([#16](https://github.com/ipsec-dev/Article30/issues/16)) ([5a13f2f](https://github.com/ipsec-dev/Article30/commit/5a13f2ff2c0f76714de89286df7bb7610ea6ec42))
* **deps-dev:** bump @commitlint/cli from 19.8.1 to 20.5.3 ([#9](https://github.com/ipsec-dev/Article30/issues/9)) ([56b8386](https://github.com/ipsec-dev/Article30/commit/56b8386d779c59b5591dd741f80def01f25dce29))
* **deps-dev:** bump @commitlint/config-conventional ([#10](https://github.com/ipsec-dev/Article30/issues/10)) ([abedd59](https://github.com/ipsec-dev/Article30/commit/abedd59f6454c1bc7bbb7fa967ed89d170c29db2))
* **deps-dev:** bump typescript-eslint in the dev-deps group ([#8](https://github.com/ipsec-dev/Article30/issues/8)) ([f0e83fc](https://github.com/ipsec-dev/Article30/commit/f0e83fc6386a960e3398e8abe985048655629abc))
* **deps:** bump the production-deps group with 2 updates ([#7](https://github.com/ipsec-dev/Article30/issues/7)) ([19bf205](https://github.com/ipsec-dev/Article30/commit/19bf20535ab31fc0386818a6f340cf37703eae44))
* initial public release (v1.0.0) ([#2](https://github.com/ipsec-dev/Article30/issues/2)) ([5003b57](https://github.com/ipsec-dev/Article30/commit/5003b57e3d8b39e08ce74b2c25ea6b76571560b9))
* **main:** release 1.0.1 ([#15](https://github.com/ipsec-dev/Article30/issues/15)) ([322e524](https://github.com/ipsec-dev/Article30/commit/322e524194206602f02862d15923eab36c5b0a8e))
* **main:** release 1.0.2 ([#17](https://github.com/ipsec-dev/Article30/issues/17)) ([fc19419](https://github.com/ipsec-dev/Article30/commit/fc19419b0a5dee26422dbb8d25b370f88c4f1375))
* **main:** release 2.0.0 ([#19](https://github.com/ipsec-dev/Article30/issues/19)) ([55c3021](https://github.com/ipsec-dev/Article30/commit/55c30216a785551d1e67f696b95a82f2f59932bc))
* **main:** release 2.0.1 ([#23](https://github.com/ipsec-dev/Article30/issues/23)) ([f639c1f](https://github.com/ipsec-dev/Article30/commit/f639c1f24754c33561cbb3dfb6d70ec5bc1863f0))
* **main:** release 2.0.2 ([#27](https://github.com/ipsec-dev/Article30/issues/27)) ([4234fe4](https://github.com/ipsec-dev/Article30/commit/4234fe4d5d217a8f0e8708a482cc25bb4b579a0d))
* **main:** release 2.0.3 ([#29](https://github.com/ipsec-dev/Article30/issues/29)) ([ec7dc16](https://github.com/ipsec-dev/Article30/commit/ec7dc161bf02bed1feed9db0f7f14076ce9dbda6))
* **main:** release 2.1.0 ([#33](https://github.com/ipsec-dev/Article30/issues/33)) ([a1d3708](https://github.com/ipsec-dev/Article30/commit/a1d37083c9bcfc0b800de10f24d55c848b954f00))
* post-init cleanup (commitlint relax + release-please changelog sections) ([#11](https://github.com/ipsec-dev/Article30/issues/11)) ([4cb5f66](https://github.com/ipsec-dev/Article30/commit/4cb5f66c2770741630e4fddb7072279e7c00c9a6))
* reset version baseline to 1.0.0 ([#35](https://github.com/ipsec-dev/Article30/issues/35)) ([094dbe4](https://github.com/ipsec-dev/Article30/commit/094dbe4440e91e61ad8b1929a351b3fefc949846))
* switch prod deploy to GHCR-pull canonical path ([#18](https://github.com/ipsec-dev/Article30/issues/18)) ([7cf034a](https://github.com/ipsec-dev/Article30/commit/7cf034a37d1919235c1bb72c767d86a371fe5ee7))

## [1.0.0] - 2026-05-07

Initial public release. See the [v1.0.0 GitHub Release](https://github.com/ipsec-dev/Article30/releases/tag/v1.0.0).

[1.0.0]: https://github.com/ipsec-dev/Article30/releases/tag/v1.0.0
