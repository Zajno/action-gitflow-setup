# Git flow setup helper

A [JS Github action](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action) that helps to determine environment:

* Environment: `stage` or `prod`
* Build target: `stage`, `prod` or `none` (supports custom)
* Deploy target: `stage`, `prod` or `none` (supports custom)

based on `push` and `pull_request` events.

## Git Flow

 - `main` below can be overriden by `production-branch` input var
 - `sync staging` label can be overriden by `sync-staging-label-name` input var

Case                          | Environment | Build   | Deploy
--------                      | ----------- | -----   | ------
Open/sync PR to `main`        | prod        | stage   | none
Merge PR or Push to `main`    | prod        | prod    | prod
Workflow Dispatch             | stage       | stage   | stage
**With `sync staging` label on PR:**
Open/Sync PR to `main` (*)    | prod        | stage   | stage
Open/Sync PR to not `main`    | stage       | stage   | stage
**With `sync staging` and custom env label (for example - `env:test`) on PR:**
Open/Sync PR to `main` (*)    | prod        | {your_env}   | {your_env}
Open/Sync PR to not `main`    | stage       | {your_env}   | {your_env}

(*) - this behaviour is disabled by default. Enable it by passing `true` to `sync-staging-on-prod`.

## Usage
For using custom environments:
   1. Create custom label in Github. For example - `env:test`
   2. Create JSON with envs object:

```yaml
    {
        "{label_name}": "{env_name}"
    }
```
   3. Put this object as string in a input parameter to action-gitflow-setup

   ```yaml
    - name: Determine Environment
       id: det-env
       uses: Zajno/action-gitflow-setup@main
       with: # list of custom envs
         custom_envs: '{
             "{label_name}": "{env_name}"
         }'
   ```


Here's a typical setup:

```yaml

on:
  pull_request:
    types: [ready_for_review, opened, synchronize, reopened]
    paths:
      - 'src/**'
  push:
    paths:
      - 'package.json'
    branches:
      - master
      - develop

jobs:
  deploy:
    if: github.event_name != 'pull_request' || github.event.pull_request.draft != true
    runs-on: ubuntu-latest
    steps:
      # ...

      - name: Determine Environment
        id: det-env
        uses: Zajno/action-gitflow-setup@main
        with: # list of custom envs
          custom_envs: '{
              "env:test": "test"
          }'

      # ...

      - name: Deploy to staging
        if: steps.det-env.outputs.deploy == 'stage'
        run: yarn deploy:stage

      - name: Deploy to production
        if: steps.det-env.outputs.deploy == 'prod'
        run: yarn deploy:prod

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
