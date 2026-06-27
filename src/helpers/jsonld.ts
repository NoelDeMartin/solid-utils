import jsonld from 'jsonld';
import { arrayFrom, isObject, stringToCamelCase, tap } from '@noeldemartin/utils';
import type { JsonLdDocument } from 'jsonld';

type ReverseRelation = { typeUrl: string; nodes: Set<string>; properties: Set<string> };

export interface FormatJsonLDOptions {
    resourceId: string;
    context?: Record<string, unknown>;
}

export type JsonLD = Partial<{
    '@context': Record<string, unknown> | string;
    '@id': string;
    '@type': null | string | string[];
}> & { [k: string]: unknown };

export type JsonLDResource = Omit<JsonLD, '@id'> & { '@id': string };
export type JsonLDGraph = {
    '@context'?: Record<string, unknown>;
    '@graph': JsonLDResource[];
};

function resolveReverseRelation(
    node: JsonLD,
    key: string,
    reverseRelations: Map<string, ReverseRelation>,
): ReverseRelation {
    return (
        reverseRelations.get(key) ??
        tap(
            {
                typeUrl: node['@type'] ? (Array.isArray(node['@type']) ? node['@type'][0] : node['@type']) : '',
                nodes: new Set(),
                properties: new Set(),
            } satisfies ReverseRelation,
            (relation) => reverseRelations.set(key, relation),
        )
    );
}

export async function formatJsonLD(json: JsonLD, options: FormatJsonLDOptions): Promise<JsonLD> {
    const context = Object.assign({}, options.context ?? { '@vocab': 'https://schema.org/' });
    const flat = await jsonld.flatten(json as JsonLdDocument);
    const nodes = Array.isArray(flat) ? flat : (('@graph' in flat ? flat['@graph'] : [flat]) as unknown[]);
    const reverseRelations = new Map<string, ReverseRelation>();
    const frame: Record<string, unknown> = {
        '@context': context,
        '@id': options.resourceId,
        '@embed': '@always',
    };

    for (const node of nodes) {
        if (!isObject(node)) {
            continue;
        }

        const nodeId = node['@id'] ? String(node['@id']) : undefined;

        if (!nodeId || nodeId === options.resourceId) {
            continue;
        }

        for (const [key, value] of Object.entries(node)) {
            if (key.startsWith('@')) {
                continue;
            }

            for (const item of arrayFrom(value)) {
                if (!isObject(item) || item['@id'] !== options.resourceId) {
                    continue;
                }

                const relation = resolveReverseRelation(node, key, reverseRelations);

                relation.nodes.add(nodeId);

                for (const propKey of Object.keys(node)) {
                    if (propKey.startsWith('@') || propKey === key) {
                        continue;
                    }

                    relation.properties.add(propKey);
                }
            }
        }
    }

    for (const [propUrl, relation] of reverseRelations.entries()) {
        const typeName = relation.typeUrl
            ? (relation.typeUrl.split(/[/#]/).filter(Boolean).pop() ?? '')
            : (propUrl.split(/[/#]/).filter(Boolean).pop() ?? '');
        const camelCaseName = stringToCamelCase(typeName);
        const reverseRelationName = `${camelCaseName}${relation.nodes.size > 1 ? 's' : ''}`;
        const subframe: Record<string, unknown> = { '@explicit': true };

        for (const fullPropKey of relation.properties) {
            const parts = fullPropKey.split(/[/#]/);
            const shortName = parts.filter(Boolean).pop() || '';

            if (!shortName) {
                continue;
            }

            subframe[shortName] = {};
        }

        context[reverseRelationName] = { '@reverse': propUrl };
        frame[reverseRelationName] = subframe;
    }

    return jsonld.frame(json as JsonLdDocument, frame as Parameters<typeof jsonld.frame>[1]) as Promise<JsonLD>;
}

export async function compactJsonLDGraph(json: JsonLDGraph): Promise<JsonLDGraph> {
    const compactedJsonLD = await jsonld.compact(json as JsonLdDocument, {});

    if ('@graph' in compactedJsonLD) {
        return compactedJsonLD as JsonLDGraph;
    }

    if ('@id' in compactedJsonLD) {
        return { '@graph': [compactedJsonLD] } as JsonLDGraph;
    }

    return { '@graph': [] };
}

export function isJsonLDGraph(json: JsonLD): json is JsonLDGraph {
    return '@graph' in json;
}
