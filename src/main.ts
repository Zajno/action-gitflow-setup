import * as core from '@actions/core';
import { context } from '@actions/github';

export async function main() {
    try {
        core.debug(new Date().toTimeString())

        const syncStagingName = core.getInput('sync-staging-label-name');
        const labels = context.payload?.pull_request?.labels || JSON.parse(core.getInput('labels-override') || '[]');

        const labelNames = labels ? labels.map(l => l.name) : [];
        const isStagingSync = labelNames.includes(syncStagingName);

        console.log(`Input labels: `, labelNames);

        const customEnv = checkLabels(labelNames, isStagingSync);

        console.log('custom env: ', customEnv);

        const mainBranch = core.getInput('production-branch') || 'main';
        const targetSyncStagingOnMain = core.getInput('sync-staging-on-prod') === 'true';

        console.log('references', {
            eventName: context.eventName,
            action: context.action,
            ref: context.ref,
            labels: labelNames,
        });

        const ctx = {
            isPush: context.eventName === 'push',
            isPR: context.eventName === 'pull_request',
            isPRSync: context.payload.action === 'synchronize' || context.payload.action === 'ready_for_review' || context.payload.action === 'opened',
            isWorkflowDispatch: context.eventName === 'workflow_dispatch',
            isPushMain: context.ref === `refs/heads/${mainBranch}`,
            isPrMain: context.payload.pull_request?.base.ref === mainBranch,
            isStagingSync,
        };

        console.log('context:', ctx);

        const result = {
            env: 'stage' as 'stage' | 'prod',
            build: null as 'prod' | 'stage' | null,
            deploy: null as 'prod' | 'stage' | null,
            sha: (context.payload.after || context.payload.pull_request?.head?.sha || '').substring(0, 7),
        };

        if (ctx.isPR && ctx.isPRSync) {
            result.build = customEnv
                ? customEnv
                : 'stage'

            if (ctx.isStagingSync) {
                if (ctx.isPrMain && targetSyncStagingOnMain) {
                    result.env = 'prod';
                }

                result.deploy = customEnv || 'stage';
            }
        } else if (ctx.isPush) {
            if (ctx.isPushMain) {
                result.env = 'prod';
                result.build = 'prod';
                result.deploy = 'prod';
            }
        } else if (ctx.isWorkflowDispatch) {
            result.build = 'stage';
            result.deploy = 'stage';
        }

        core.startGroup('Result (for debugging)');
        console.log('RESULT', result);
        core.endGroup();

        core.setOutput('env', result.env || 'stage');
        core.setOutput('build', result.build || 'none');
        core.setOutput('deploy', result.deploy || 'none');
        core.setOutput('sha_short', result.sha);
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}

function checkLabels(labelNames: string[], isStagingSync: boolean) {
    try {
        const ENVS = core.getInput('custom_envs');
        console.log(`Input envs: `, ENVS);

        const envs = ENVS ? JSON.parse(ENVS) : {};

        let env = null;

        if (isStagingSync) {
            const envLabel = labelNames.find(name => !!envs[name]);
            env = envs[envLabel];
        }

        return env;
    } catch (error) {
        core.error(error.message);
        core.setFailed(error.message);
    }

    return null;
}

main();
