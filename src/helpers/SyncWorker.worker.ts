import http from 'http';
import { parentPort } from 'worker_threads';
import { stringMatch } from '@noeldemartin/utils';
import type { Server } from 'http';
import type { Closure, ClosureArgs } from '@noeldemartin/utils';

export default class SyncWorker<Actions extends Record<string, Closure>> {

    private server?: Server;
    private actions: Actions;
    private actionsPayload: Record<string, { action: keyof Actions; args: ClosureArgs }>;

    constructor(actions: Actions) {
        this.actions = actions;
        this.actionsPayload = {};
    }

    public start(): void {
        if (this.server) {
            throw new Error('Sync Worker already running');
        }

        this.server = http.createServer(async (request, res) => {
            const match = stringMatch<2>(request.url ?? '', /\?id=(.*)/);

            if (!match) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end('Missing request id');

                return;
            }

            const payload = this.actionsPayload[match[1]];

            if (!payload) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(`Invalid request id (${match[1]})`);

                return;
            }

            const { action, args } = payload;
            const result = await this.actions[action]?.(...args);

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end('success:' + JSON.stringify(result));
        });

        parentPort?.on('message', (message) => {
            if (message === 'stop') {
                this.server?.close(() => parentPort?.postMessage('stopped'));

                return;
            }

            const { id, ...payload } = message;

            this.actionsPayload[id] = payload;
        });

        this.server.listen(3000, () => parentPort?.postMessage('started'));
    }

}
