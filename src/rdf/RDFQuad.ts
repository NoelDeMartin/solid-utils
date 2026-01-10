import type { Quad, Quad_Graph, Quad_Object, Quad_Predicate, Quad_Subject, Term } from '@rdfjs/types';

import RDFDefaultGraph from './RDFDefaultGraph';
import RDFLiteral from './RDFLiteral';
import RDFNamedNode from './RDFNamedNode';

export default class RDFQuad implements Quad {

    public termType = 'Quad' as const;
    public value = '' as const;
    public subject: Quad_Subject;
    public predicate: Quad_Predicate;
    public object: Quad_Object;
    public graph: Quad_Graph;

    constructor(subject: string | Quad_Subject, predicate: string | Quad_Predicate, object: string | Quad_Object) {
        this.subject = typeof subject === 'string' ? new RDFNamedNode(subject) : subject;
        this.predicate = typeof predicate === 'string' ? new RDFNamedNode(predicate) : predicate;
        this.object = typeof object === 'string' ? new RDFLiteral(object) : object;
        this.graph = new RDFDefaultGraph();
    }

    public equals(other: Term | null | undefined): boolean {
        return (
            this.termType === other?.termType &&
            this.subject.equals(other.subject) &&
            this.predicate.equals(other.predicate) &&
            this.object.equals(other.object)
        );
    }

}
