import { fetchSolidDocument } from '@/helpers/io';
import type { Fetch } from '@/helpers/io';
import type SolidThing from '@/models/SolidThing';

export async function findContainerRegistration(
    typeIndexUrl: string,
    childrenType: string,
    fetch?: Fetch,
): Promise<SolidThing | null> {
    const typeIndex = await fetchSolidDocument(typeIndexUrl, fetch);
    const containerQuad = typeIndex
        .statements(undefined, 'rdfs:type', 'solid:TypeRegistration')
        .find(
            statement =>
                typeIndex.contains(statement.subject.value, 'solid:forClass', childrenType) &&
                typeIndex.contains(statement.subject.value, 'solid:instanceContainer'),
        );

    return containerQuad
        ? typeIndex.getThing(containerQuad.subject.value) ?? null
        : null;
}
