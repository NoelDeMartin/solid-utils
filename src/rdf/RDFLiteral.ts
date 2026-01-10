import type { Literal, NamedNode, Term } from '@rdfjs/types';

import { DATATYPE_STRING } from './constants';

export default class RDFLiteral implements Literal {

    public termType = 'Literal' as const;
    public value: string;
    public language: string;
    public datatype: NamedNode;

    constructor(value: string, language: string = '', datatype: NamedNode = DATATYPE_STRING) {
        this.value = value;
        this.language = language;
        this.datatype = datatype;
    }

    public equals(other: Term | null | undefined): boolean {
        return (
            this.termType === other?.termType &&
            this.value === other.value &&
            this.language === other.language &&
            this.datatype.equals(other.datatype)
        );
    }

}
