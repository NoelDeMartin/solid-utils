import { JSError } from '@noeldemartin/utils';

export default class NotFound extends JSError {

    public readonly url: string;

    constructor(url: string) {
        super(`Document with '${url}' url not found`);

        this.url = url;
    }

}
