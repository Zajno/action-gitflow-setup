import * as core from '@actions/core';
import { context } from '@actions/github';

export async function main() {
    try {
        core.startGroup('Steps');

        core.debug(new Date().toTimeString())

        const syncStagingName = core.getInput('sync-staging-label-name');

        const labelNames = getCurrentLabelNames();
        const isStagingSync = labelNames.includes(syncStagingName);

        console.log(`Input labels: `, labelNames);

        const customEnv = getCustomEnv(labelNames, isStagingSync);

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
            env: 'stage',
            build: null as string,
            deploy: null as string,
            sha: (context.payload.after || context.payload.pull_request?.head?.sha || '').substring(0, 7),
        };

        if (ctx.isPR && ctx.isPRSync) {
            result.build = customEnv.build || 'stage';

            if (ctx.isStagingSync) {
                if (ctx.isPrMain && targetSyncStagingOnMain) {
                    result.env = 'prod';
                }

                result.deploy = customEnv.deploy || 'stage';
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

        core.endGroup();

        core.startGroup('Result');
        console.log('RESULT', result);
        core.endGroup();

        core.setOutput('env', result.env || 'stage');
        core.setOutput('build', result.build || 'none');
        core.setOutput('deploy', result.deploy || 'none');
        core.setOutput('sha_short', result.sha);
        core.setOutput('branch_name', context.ref.replace('refs/heads/', ''));
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}

function getCurrentLabelNames(): string[] {
    const overrideData = core.getInput('labels-override');
    const override = overrideData && JSON.parse(overrideData);
    const labels = override || context.payload?.pull_request?.labels;
    return labels?.map(l => l.name) || [];
}

function getCustomEnv(labelNames: string[], isStagingSync: boolean) {

    const result = {
        build: null as string,
        deploy: null as string,
    };

    try {
        if (isStagingSync) {

            const ENVS = core.getInput('custom_envs');
            console.log(`Input envs: `, ENVS);

            const envs = ENVS ? JSON.parse(ENVS) : {};
            const envLabel = labelNames.find(name => !!envs[name]);
            const envData = envs[envLabel];
            if (typeof envData === 'string') {
                result.build = envData;
                result.deploy = envData;
            } else if (typeof envData === 'object') {
                if (envData.build) {
                    result.build = envData.build;
                }
                if (envData.deploy) {
                    result.deploy = envData.deploy;
                }
            }
        }
    } catch (error) {
        core.error(error.message);
        core.setFailed(error.message);
    }

    return result;
}

main();
