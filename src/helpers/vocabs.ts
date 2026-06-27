export const knownPrefixes: RDFContext = {
    acl: 'http://www.w3.org/ns/auth/acl#',
    crdt: 'https://vocab.noeldemartin.com/crdt/',
    foaf: 'http://xmlns.com/foaf/0.1/',
    fs: 'https://vocab.noeldemartin.com/fs/',
    ldp: 'http://www.w3.org/ns/ldp#',
    pim: 'http://www.w3.org/ns/pim/space#',
    purl: 'http://purl.org/dc/terms/',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    schema: 'https://schema.org/',
    solid: 'http://www.w3.org/ns/solid/terms#',
    vcard: 'http://www.w3.org/2006/vcard/ns#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
};

export type RDFContext = Record<string, string>;

export interface ExpandIRIOptions {
    defaultPrefix: string;
    extraContext: RDFContext;
}

export interface ShortenIRIOptions {
    vocab?: string;
    context?: RDFContext;
}

export function defineIRIPrefix(name: string, value: string): void {
    knownPrefixes[name] = value;
}

export function expandIRI(iri: string, options: Partial<ExpandIRIOptions> = {}): string {
    if (iri.startsWith('http')) return iri;

    const [prefix, name] = iri.split(':');

    if (prefix && name) {
        const expandedPrefix = knownPrefixes[prefix] ?? options.extraContext?.[prefix] ?? null;

        if (!expandedPrefix) throw new Error(`Can't expand IRI with unknown prefix: '${iri}'`);

        return expandedPrefix + name;
    }

    if (!options.defaultPrefix) throw new Error(`Can't expand IRI without a default prefix: '${iri}'`);

    return options.defaultPrefix + prefix;
}

export function shortenIRI(iri: string, options: ShortenIRIOptions = {}): string {
    const vocab = options.vocab;

    if (vocab && iri.startsWith(vocab)) {
        return iri.slice(vocab.length);
    }

    const context = options.context ?? {};

    for (const [prefix, value] of Object.entries(context)) {
        if (!iri.startsWith(value)) {
            continue;
        }

        return `${prefix}:${iri.slice(value.length)}`;
    }

    return iri;
}
