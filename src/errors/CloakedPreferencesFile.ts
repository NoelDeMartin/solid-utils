import { JSError } from '@noeldemartin/utils';

export default class CloakedPreferencesFile extends JSError {
    public readonly url: string;

    constructor(url: string, message: string) {
        super(message);

        this.url = url;
    }
}
