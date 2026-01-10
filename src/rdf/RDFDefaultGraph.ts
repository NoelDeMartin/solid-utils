import type { DefaultGraph, Term } from '@rdfjs/types';

export default class RDFDefaultGraph implements DefaultGraph {

    public termType = 'DefaultGraph' as const;
    public value = '' as const;

    public equals(other: Term | null | undefined): boolean {
        return this.termType === other?.termType && this.value === other.value;
    }

}
