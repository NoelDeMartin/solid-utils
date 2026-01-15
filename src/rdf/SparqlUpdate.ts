import type { Quad, Quad_Object, Quad_Predicate, Quad_Subject } from '@rdfjs/types';

import type { SolidDocument } from '@noeldemartin/solid-utils/models';

export default class SparqlUpdate {

    public inserts: Quad[] = [];
    public deletes: Quad[] = [];
    private document?: SolidDocument;

    public constructor(document?: SolidDocument) {
        this.document = document;
    }

    public insert(...quads: Array<Quad | Quad[]>): this {
        this.inserts.push(...quads.flat());

        return this;
    }

    public delete(subject: Quad_Subject, predicate?: Quad_Predicate, object?: Quad_Object): this {
        this.document && this.deletes.push(...this.document.statements(subject, predicate, object));

        return this;
    }

}
