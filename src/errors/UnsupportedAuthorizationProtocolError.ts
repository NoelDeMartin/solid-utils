import { JSError } from '@noeldemartin/utils';
import type { JSErrorOptions } from '@noeldemartin/utils';

export default class UnsupportedAuthorizationProtocolError extends JSError {

    public readonly url: string;
    public readonly protocol: string;

    constructor(url: string, protocol: string, options?: JSErrorOptions) {
        super(`The resource at ${url} is using an unsupported authorization protocol (${protocol})`, options);

        this.url = url;
        this.protocol = protocol;
    }

}
