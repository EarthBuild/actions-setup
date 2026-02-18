# Setup Earthly - GitHub Action

This repository contains an action for use with GitHub Actions, which installs [earthly](https://github.com/EarthBuild/earthbuild) with a semver-compatible version.

The package is installed into `/home/runner/.earthly` (or equivalent on Windows) and the `bin` subdirectory is added to the PATH.

## Usage

Full example:

```yml
name: GitHub Actions CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  tests:
    name: example earthbuild test
    runs-on: ubuntu-latest
    steps:
      - uses: EarthBuild/actions-setup@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          version: 'latest' # or pin to an specific version, e.g. "0.8.1"
      - uses: actions/checkout@v2
      - name: Docker login # to avoid dockerhub rate-limiting
        run: docker login --username "${{ secrets.DOCKERHUB_USERNAME }}" --password "${{ secrets.DOCKERHUB_PASSWORD }}"
      - name: what version is installed?
        run: earthly --version
      - name: run the earthbuild hello world
        run: earthly github.com/EarthBuild/hello-world:main+hello
```

Install the latest version of earthbuild:

```yaml
- name: Install earthbuild
  uses: EarthBuild/actions-setup@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

Install a specific version of earthbuild:

```yaml
- name: Install earthbuild
  uses: EarthBuild/actions-setup@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    version: 0.8.1
```

Install a version that adheres to a semver range

```yaml
- name: Install EarthBuild
  uses: EarthBuild/actions-setup@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    version: ^0.8.0
```

### Testing

You can perform a local test by running `earthly +all`.

It is also possible to use [act](https://github.com/nektos/act) to test the contents of the github actions config.

## Configuration

The action can be configured with the following arguments:

- `version` - The version of earthbuild to install. Default is `latest`. Accepts semver style values.
- `prerelease` (optional) - allow prerelease versions.
- `use-cache` (optional) - whether to use the cache to store earthbuild or not.
- `github-token` (optional) - GitHub token for fetching earthbuild version list. Recommended to avoid GitHub API ratelimit.
