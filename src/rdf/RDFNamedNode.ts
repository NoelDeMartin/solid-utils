import type { NamedNode, Term } from '@rdfjs/types';

export default class RDFNamedNode implements NamedNode {

    public termType = 'NamedNode' as const;
    public value: string;

    constructor(value: string) {
        this.value = value;
    }

    public equals(other: Term | null | undefined): boolean {
        return this.termType === other?.termType && this.value === other.value;
    }

}
