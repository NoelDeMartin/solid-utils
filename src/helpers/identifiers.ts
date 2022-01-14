import { arr, objectWithoutEmpty, urlParse } from '@noeldemartin/utils';
import type { UrlParts } from '@noeldemartin/utils';

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

export function parseResourceSubject(subject: string): SubjectParts {
    const parts = urlParse(subject);

    return !parts ? {} : objectWithoutEmpty({
        containerUrl: getContainerUrl(parts),
        documentName: parts.path ? parts.path.split('/').pop() : null,
        resourceHash: parts.fragment,
    });
}
