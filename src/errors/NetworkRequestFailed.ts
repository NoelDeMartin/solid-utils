import { JSError } from '@noeldemartin/utils';
import type { JSErrorOptions } from '@noeldemartin/utils';

export default class NetworkRequestFailed extends JSError {

    public readonly url: string;

    constructor(url: string, options?: JSErrorOptions) {
        super(`Request failed trying to fetch ${url}`, options);

        this.url = url;
    }

}
