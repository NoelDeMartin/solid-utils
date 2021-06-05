import { Error } from '@noeldemartin/utils';

export default class NetworkRequestError extends Error {

    public readonly url: string;

    constructor(url: string) {
        super(`Request failed trying to fetch ${url}`);

        this.url = url;
    }

}
