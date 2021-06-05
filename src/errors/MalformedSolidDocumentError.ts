import { Error } from '@noeldemartin/utils';

function errorMessage(
    documentUrl: string | null,
    documentFormat: SolidDocumentFormat,
    malformationDetails: string,
): string {
    return documentUrl
        ? `Malformed ${documentFormat} document found at ${documentUrl} - ${malformationDetails}`
        : `Malformed ${documentFormat} document - ${malformationDetails}`;
}

export enum SolidDocumentFormat {
    Turtle = 'Turtle',
}

export default class MalformedSolidDocumentError extends Error {

    public readonly documentUrl: string | null;
    public readonly documentFormat: SolidDocumentFormat;
    public readonly malformationDetails: string;

    constructor(documentUrl: string | null, documentFormat: SolidDocumentFormat, malformationDetails: string) {
        super(errorMessage(documentUrl, documentFormat, malformationDetails));

        this.documentUrl = documentUrl;
        this.documentFormat = documentFormat;
        this.malformationDetails = malformationDetails;
    }

}
