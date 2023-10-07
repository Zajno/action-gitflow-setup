# Git flow setup helper

A [JS/TS Github action](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action) that helps to determine environment:

* Environment: `stage` or `prod`
* Build target: `stage`, `prod` or `none` (supports custom)
* Deploy target: `stage`, `prod` or `none` (supports custom)

based on `push` and `pull_request` events.

## Git Flow

 - `main` below can be overridden by `production-branch` input var
 - `sync staging` label can be overridden by `sync-staging-label-name` input var

Case                          | Environment | Build   | Deploy
--------                      | ----------- | -----   | ------
Open/sync PR to `main`        | prod        | stage   | none
Merge PR or Push to `main`    | prod        | prod    | prod
Workflow Dispatch             | stage       | stage   | stage
**With `sync staging` label on PR:**
Open/Sync PR to `main` (*)    | prod        | stage   | stage
Open/Sync PR to not `main`    | stage       | stage   | stage
**With `sync staging` and `custom_envs` (see below) label on PR:**
Open/Sync PR to `main` (*)    | prod        | {your_env}   | {your_env}
Open/Sync PR to not `main`    | stage       | {your_env}   | {your_env}

(*) - this behavior is disabled by default. Enable it by passing `true` to `sync-staging-on-prod`.

## Custom envs usage

When a label of `"sync-channel-label-name"` name is present on a PR, additionally it's possible to specify custom environments for build and deploy.

For that use "`custom_envs`" parameter which should be a JSON string, so to map additional label names to detect on a PR, to choose a different build or deploy target/environment.

Options for a label value format:

1. just a `string`: will be used as an environment name for all outputs (build, deploy)
2. an `object` of type:
```ts
{
  build?: string;
  deploy?: string;
}
```
so you can specify different things for each output type. For skipped types the fallback is 'stage'.

### Example:

```yaml
  with:
    custom_envs: '{
        "env:test": "test",
        "target channel": {
          "deploy": "channel"
        }
    }'
```

In this example, when a PR is synced **and** `"sync-channel-label-name"` label is applied, additional rules will work:

 - if `env:test` label is (also) applied, output will be:
    - build: `test`
    - deploy: `test`
 - else if `target channel` label applied, output will be:
    - build: `stage`
    - deploy: `channel`


## Setup for typical usage

See more input parameters in [action.yml](./action.yml).

```yaml

on:
  pull_request:
    types: [ready_for_review, opened, synchronize, reopened]
    paths:
      # whenever something changes in your source code
      - 'src/**'
  push:
    paths:
      # whenever version changes
      - 'package.json'
    branches:
      - main

jobs:
  deploy:
    # either `push` event or `pull_request` event with `draft: false`
    if: github.event_name != 'pull_request' || github.event.pull_request.draft != true
    runs-on: ubuntu-latest
    steps:
      # ... checkout, setup node, etc

      - name: Determine Environment
        id: det-env
        uses: Zajno/action-gitflow-setup@v2

      # ... build, test, lint etc

      # in the same way works for build steps, use `steps.det-env.outputs.build`
      - name: Deploy to ${{ steps.det-env.outputs.deploy }}
        if: steps.det-env.outputs.deploy != 'none'
        # your package.json should have `deploy:stage` and `deploy:prod` scripts
        run: yarn deploy:${{ steps.det-env.outputs.deploy }}}

      # ...
```

## Development

```bash
npm install

# make changes to src/main.ts

npm run build
npm run package

# OR
npm run all
```

Run `npm all` before committing & pushing – `dist` folder is used to source JS code so should be up to date.

To test locally, use [`act`](https://github.com/nektos/act)

```bash
brew install act

# runs `.github/workflows/test.yaml` locally
# Docker is required!
# see `act` docs for more info
act

```
