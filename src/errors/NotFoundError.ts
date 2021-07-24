import { Error } from '@noeldemartin/utils';

export default class NotFoundError extends Error {

    public readonly url: string;

    constructor(url: string) {
        super(`Document with '${url}' url not found`);

        this.url = url;
    }

}
