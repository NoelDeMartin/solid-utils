import { Worker } from 'worker_threads';
import { PromisedValue, uuid } from '@noeldemartin/utils';
import type { Closure, GetClosureArgs, GetClosureResult } from '@noeldemartin/utils';

export type SyncResponse<T> = T extends Promise<infer Response> ? Response : never;

export default class SyncWorker<Actions extends Record<string, Closure>> {

    private instance?: Worker;

    public async start(filename: string): Promise<void> {
        const started = new PromisedValue<void>();
        this.instance = new Worker(filename);

        this.instance.once('message', () => started.resolve());

        await started;
    }

    public async stop(): Promise<void> {
        if (!this.instance) {
            return;
        }

        const stopped = new PromisedValue<void>();

        this.instance.once('message', () => stopped.resolve());
        this.instance.postMessage('stop');

        await stopped;

        this.instance.terminate();
    }

    public execute<T extends keyof Actions>(
        action: T,
        args: GetClosureArgs<Actions[T]>,
    ): SyncResponse<GetClosureResult<Actions[T]>> {
        if (!this.instance) {
            throw new Error('Worker is not running, please call startWorker() before using this method');
        }

        const id = uuid();
        const req = new XMLHttpRequest();

        this.instance.postMessage({ id, action, args });

        req.open('GET', `http://localhost:3000?id=${id}`, false);
        req.send();

        if (!req.responseText.startsWith('success:')) {
            throw new Error('Invalid SyncWorker request: ' + req.responseText);
        }

        return JSON.parse(req.responseText.slice('success:'.length));
    }

}
