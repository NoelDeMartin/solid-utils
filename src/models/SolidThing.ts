import type { Quad } from '@rdfjs/types';

import { expandIRI } from '@noeldemartin/solid-utils/helpers/vocabs';

export default class SolidThing {

    public readonly url: string;
    private quads: Quad[];

    public constructor(url: string, quads: Quad[]) {
        this.url = url;
        this.quads = quads;
    }

    public value(property: string): string | undefined {
        return this.quads.find((quad) => quad.predicate.value === expandIRI(property))?.object.value;
    }

    public values(property: string): string[] {
        return this.quads
            .filter((quad) => quad.predicate.value === expandIRI(property))
            .map((quad) => quad.object.value);
    }

}
