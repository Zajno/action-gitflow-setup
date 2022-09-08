# Git flow setup helper

A composite Github action that helps to determine environment:

* Environment: Staging or Production
* Build target: `stage`, `prod` or `none` (supports custom)
* Deploy target: `stage`, `prod` or `none` (supports custom)

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
**With `sync staging` and custom env label (for example - `env:test`) on PR:**
Open/Sync PR to `master`        | Production  | {your_env}   | {your_env}
Open/Sync PR to not `master`    | Staging     | {your_env}   | {your_env}
**With `sync staging prod` label on PR:**
Open/Sync PR to `master`        | Production  | prod    | stage
Open/Sync PR to not `master`    | Staging     | prod    | stage


## Usage
For using custom environments:
   1) Create custom label in Github. For example - `env:test`
   2) Create JSON with envs object:

```yaml
    {
        "{label_name}": "{env_name}"
    }
```
   3) Put this object as string in a input parameter to action-gitflow-setup
   ```yaml
    - name: Determine Environment
       id: det-env
       uses: Zajno/action-gitflow-setup@main
       with: # list of custom envs
         envs: '{
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
          envs: '{
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
