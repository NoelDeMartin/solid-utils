export type JsonLD = Partial<{
    '@context': Record<string, unknown>;
    '@id': string;
    '@type': null | string | string[];
}> & { [k: string]: unknown };

export type JsonLDResource = Omit<JsonLD, '@id'> & { '@id': string };
export type JsonLDGraph = { '@graph': JsonLDResource[] };

export function isJsonLDGraph(jsonld: JsonLD): jsonld is JsonLDGraph {
    return '@graph' in jsonld;
}
