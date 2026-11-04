import { urlResolve } from '@noeldemartin/utils';

interface Link {
    url: string;
    params: Record<string, string[]>;
}

const LINK_URL_REGEX = /\s*<([^>]*)>/y;
const LINK_PARAM_REGEX = /\s*;\s*([^\s=;,]+)(?:\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^\s;,]*)))?/y;
const LINK_SEPARATOR_REGEX = /[^,]*,?/y;

function parseLinkHeader(header: string): Link[] {
    const links: Link[] = [];
    let index = 0;

    while (index < header.length) {
        LINK_URL_REGEX.lastIndex = index;

        const urlMatch = LINK_URL_REGEX.exec(header);

        if (!urlMatch) {
            break;
        }

        const link: Link = { url: urlMatch[1] ?? '', params: {} };

        index = LINK_URL_REGEX.lastIndex;
        LINK_PARAM_REGEX.lastIndex = index;

        for (let paramMatch = LINK_PARAM_REGEX.exec(header); paramMatch; paramMatch = LINK_PARAM_REGEX.exec(header)) {
            const name = (paramMatch[1] ?? '').toLowerCase();
            const value = paramMatch[2]?.replace(/\\(.)/g, '$1') ?? paramMatch[3] ?? '';

            link.params[name] = [...(link.params[name] ?? []), value];
            index = LINK_PARAM_REGEX.lastIndex;
        }

        LINK_SEPARATOR_REGEX.lastIndex = index;
        LINK_SEPARATOR_REGEX.exec(header);
        index = LINK_SEPARATOR_REGEX.lastIndex;
        links.push(link);
    }

    return links;
}

function getLinkHeader(headers: Headers | string | null | undefined): string {
    if (!headers) {
        return '';
    }

    return typeof headers === 'string' ? headers : (headers.get('Link') ?? '');
}

export interface LinkHeaderOptions {
    baseUrl?: string;
}

export function getLinkHeaderUrls(
    headers: Headers | string | null | undefined,
    rel: string,
    options: LinkHeaderOptions = {},
): string[] {
    const relation = rel.toLowerCase();

    return parseLinkHeader(getLinkHeader(headers))
        .filter((link) => (link.params.rel ?? []).some((value) => value.toLowerCase().split(/\s+/).includes(relation)))
        .map((link) => (options.baseUrl ? urlResolve(options.baseUrl, link.url) : link.url));
}

export function getLinkHeaderUrl(
    headers: Headers | string | null | undefined,
    rel: string,
    options: LinkHeaderOptions = {},
): string | null {
    return getLinkHeaderUrls(headers, rel, options)[0] ?? null;
}
