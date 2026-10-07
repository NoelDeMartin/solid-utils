import { expandIRI } from '@noeldemartin/solid-utils/helpers/vocabs';

import RDFDefaultGraph from './RDFDefaultGraph';
import RDFNamedNode from './RDFNamedNode';

export const DATATYPE_STRING = new RDFNamedNode(expandIRI('xsd:string'));
export const DEFAULT_GRAPH = new RDFDefaultGraph();
