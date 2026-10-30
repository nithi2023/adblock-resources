# adblock-resources

Scriptlet and redirect resources for [adblock-rust](https://github.com/brave/adblock-rust) 0.13.x, the ad-blocking
engine used by the browser. A daily GitHub Actions job rebuilds `dist/resources.json` from the latest
[uBlock Origin](https://github.com/gorhill/uBlock) release and [Brave's resources](https://github.com/brave/adblock-resources),
the same way Brave builds its own, and commits it when it changes. The browser downloads it from:

    https://raw.githubusercontent.com/nithi2023/adblock-resources/main/dist/resources.json

`dist/meta.json` records the uBlock Origin release it was built from.

## Build locally

    npm ci
    node build.mjs                 # latest uBlock Origin release
    UBO_TAG=1.75.0 node build.mjs  # a specific release

Needs Node 24+ and Rust (the `adblock-rs` package compiles on install).

## Licences

- The build script and workflow in this repository: MIT (see `LICENSE`).
- `dist/resources.json` contains third-party code under its own licences:
  - uBlock Origin scriptlets and redirect resources: GPL-3.0 (https://github.com/gorhill/uBlock).
  - Brave's resources: MPL-2.0 (https://github.com/brave/adblock-resources).
