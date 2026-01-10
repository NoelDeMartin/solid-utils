import jsonld from 'jsonld';
import type { JsonLdDocument } from 'jsonld';

export type JsonLD = Partial<{
    '@context': Record<string, unknown> | string;
    '@id': string;
    '@type': null | string | string[];
}> & { [k: string]: unknown };

export type JsonLDResource = Omit<JsonLD, '@id'> & { '@id': string };
export type JsonLDGraph = {
    '@context'?: Record<string, unknown>;
    '@graph': JsonLDResource[];
};

export async function compactJsonLDGraph(json: JsonLDGraph): Promise<JsonLDGraph> {
    const compactedJsonLD = await jsonld.compact(json as JsonLdDocument, {});

    if ('@graph' in compactedJsonLD) {
        return compactedJsonLD as JsonLDGraph;
    }

    if ('@id' in compactedJsonLD) {
        return { '@graph': [compactedJsonLD] } as JsonLDGraph;
    }

    return { '@graph': [] };
}

export function isJsonLDGraph(json: JsonLD): json is JsonLDGraph {
    return '@graph' in json;
}
