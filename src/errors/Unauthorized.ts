import { JSError } from '@noeldemartin/utils';

function errorMessage(url: string, responseStatus?: number): string {
    const typeInfo = responseStatus === 403 ? ' (Forbidden)' : '';

    return `Unauthorized${typeInfo}: ${url}`;
}

export default class Unauthorized extends JSError {

    public readonly url: string;
    public readonly responseStatus?: number;

    constructor(url: string, responseStatus?: number) {
        super(errorMessage(url, responseStatus));

        this.url = url;
        this.responseStatus = responseStatus;
    }

    public get forbidden(): boolean | undefined {
        return typeof this.responseStatus !== 'undefined' ? this.responseStatus === 403 : undefined;
    }

}
