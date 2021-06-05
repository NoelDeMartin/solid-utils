const knownPrefixes: Record<string, string> = {
    foaf: 'http://xmlns.com/foaf/0.1/',
    pim: 'http://www.w3.org/ns/pim/space#',
    purl: 'http://purl.org/dc/terms/',
    rdfs: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    schema: 'https://schema.org/',
    solid: 'http://www.w3.org/ns/solid/terms#',
    vcard: 'http://www.w3.org/2006/vcard/ns#',
};

export function defineIRIPrefix(name: string, value: string): void {
    knownPrefixes[name] = value;
}

export function expandIRI(iri: string, defaultPrefix?: string): string {
    if (iri.startsWith('http'))
        return iri;

    const [prefix, name] = iri.split(':');

    if (!name && !defaultPrefix)
        throw new Error(`Can't expand IRI without a default prefix: '${iri}'`);

    if (!(prefix in knownPrefixes))
        throw new Error(`Can't expand IRI with unknown prefix: '${iri}'`);

    return name ? knownPrefixes[prefix] + name : defaultPrefix + prefix;
}
