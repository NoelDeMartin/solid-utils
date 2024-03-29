import { compactJsonLD } from '@noeldemartin/solid-utils-external';
import type { JsonLdDocument } from '@noeldemartin/solid-utils-external';

export type JsonLD = Partial<{
    '@context': Record<string, unknown>;
    '@id': string;
    '@type': null | string | string[];
}> & { [k: string]: unknown };

export type JsonLDResource = Omit<JsonLD, '@id'> & { '@id': string };
export type JsonLDGraph = {
    '@context'?: Record<string, unknown>;
    '@graph': JsonLDResource[];
};

export async function compactJsonLDGraph(jsonld: JsonLDGraph): Promise<JsonLDGraph> {
    const compactedJsonLD = await compactJsonLD(jsonld as JsonLdDocument, {});

    if ('@graph' in compactedJsonLD) {
        return compactedJsonLD as JsonLDGraph;
    }

    if ('@id' in compactedJsonLD) {
        return { '@graph': [compactedJsonLD] } as JsonLDGraph;
    }

    return { '@graph': [] };
}

export function isJsonLDGraph(jsonld: JsonLD): jsonld is JsonLDGraph {
    return '@graph' in jsonld;
}
