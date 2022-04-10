import { Error } from '@noeldemartin/utils';
import type { ErrorOptions } from '@noeldemartin/utils';

export default class NetworkRequestError extends Error {

    public readonly url: string;

    constructor(url: string, options?: ErrorOptions) {
        super(`Request failed trying to fetch ${url}`, options);

        this.url = url;
    }

}
