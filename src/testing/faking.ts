import { faker } from '@faker-js/faker';
import { stringToSlug } from '@noeldemartin/utils';

export interface ContainerOptions {
    baseUrl: string;
}

export interface DocumentOptions extends ContainerOptions {
    containerUrl: string;
    name: string;
}

export interface ResourceOptions extends DocumentOptions {
    documentUrl: string;
    hash: string;
}

export function fakeContainerUrl(options: Partial<ContainerOptions> = {}): string {
    const baseUrl = options.baseUrl ?? faker.internet.url();

    return baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
}

export function fakeDocumentUrl(options: Partial<DocumentOptions> = {}): string {
    const containerUrl = options.containerUrl ?? fakeContainerUrl(options);
    const name = options.name ?? faker.random.word();

    return containerUrl + stringToSlug(name);
}

export function fakeResourceUrl(options: Partial<ResourceOptions> = {}): string {
    const documentUrl = options.documentUrl ?? fakeDocumentUrl(options);
    const hash = options.hash ?? 'it';

    return documentUrl + '#' + hash;
}
