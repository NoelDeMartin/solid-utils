import { JSError } from '@noeldemartin/utils';

function getErrorMessage(messageOrResponse: string | Response, response?: Response): string {
    response = response ?? (messageOrResponse as Response);

    return typeof messageOrResponse === 'string'
        ? `${messageOrResponse} (returned ${response.status} status code)`
        : `Request to ${response.url} returned ${response.status} status code`;
}

export default class UnsuccessfulRequestError extends JSError {

    public response: Response;

    constructor(response: Response);
    constructor(message: string, response: Response);
    constructor(messageOrResponse: string | Response, response?: Response) {
        super(getErrorMessage(messageOrResponse, response));

        this.response = response ?? (messageOrResponse as Response);
    }

}
