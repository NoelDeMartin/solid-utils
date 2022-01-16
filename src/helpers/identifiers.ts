import { arr, isArray, isObject, objectDeepClone, objectWithoutEmpty, tap, urlParse, uuid } from '@noeldemartin/utils';
import type { UrlParts } from '@noeldemartin/utils';
import type { JsonLD, JsonLDResource } from '@/helpers';

export interface SubjectParts {
    containerUrl?: string;
    documentName?: string;
    resourceHash?: string;
}

function getContainerPath(parts: UrlParts): string | null {
    if (!parts.path || !parts.path.startsWith('/'))
        return null;

    if (parts.path.match(/^\/[^/]*$/))
        return '/';

    return `/${arr(parts.path.split('/')).filter().slice(0, -1).join('/')}/`.replace('//', '/');
}

function getContainerUrl(parts: UrlParts): string | null {
    const containerPath = getContainerPath(parts);

    return parts.protocol && parts.domain
        ? `${parts.protocol}://${parts.domain}${containerPath ?? '/'}`
        : containerPath;
}

function __mintJsonLDIdentifiers(jsonld: JsonLD): void {
    if (!('@type' in jsonld) || '@value' in jsonld)
        return;

    jsonld['@id'] = jsonld['@id'] ?? uuid();

    for (const propertyValue of Object.values(jsonld)) {
        if (isObject(propertyValue))
            __mintJsonLDIdentifiers(propertyValue);

        if (isArray(propertyValue))
            propertyValue.forEach(value => isObject(value) && __mintJsonLDIdentifiers(value));
    }
}

export function mintJsonLDIdentifiers(jsonld: JsonLD): JsonLDResource {
    return tap(objectDeepClone(jsonld) as JsonLDResource, clone => __mintJsonLDIdentifiers(clone));
}

export function parseResourceSubject(subject: string): SubjectParts {
    const parts = urlParse(subject);

    return !parts ? {} : objectWithoutEmpty({
        containerUrl: getContainerUrl(parts),
        documentName: parts.path ? parts.path.split('/').pop() : null,
        resourceHash: parts.fragment,
    });
}
