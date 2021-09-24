# Git flow setup helper

A composite Github action that helps to determine:

* Environment: Staging or Production
* Build target: `stage`, `prod` or `none`
* Deploy target: `stage`, `prod` or `none`

based on `push` and `pull_request` events.

## Git Flow

Case                            | Environment | Build   | Deploy
--------                        | ----------- | -----   | ------
Open/sync PR to `master`        | Production  | stage   | none
Merge PR or Push to `master`    | Production  | prod    | prod
Workflow Dispatch               | Staging     | stage   | stage
**With `sync staging` label on PR:**
Open/Sync PR to `master`        | Production  | stage   | stage
Open/Sync PR to not `master`    | Staging     | stage   | stage
**With `sync staging prod` label on PR:**
Open/Sync PR to `master`        | Production  | prod    | stage
Open/Sync PR to not `master`    | Staging     | prod    | stage


## Usage

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

      # ...

      - name: Deploy to staging
        if: steps.det-env.outputs.deploy == 'stage'
        run: yarn deploy:stage

      - name: Deploy to production
        if: steps.det-env.outputs.deploy == 'prod'
        run: yarn deploy:prod

      # ...
```
