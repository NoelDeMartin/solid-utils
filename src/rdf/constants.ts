import { expandIRI } from '@noeldemartin/solid-utils/helpers/vocabs';

import RDFNamedNode from './RDFNamedNode';

export const DATATYPE_STRING = new RDFNamedNode(expandIRI('xsd:string'));
