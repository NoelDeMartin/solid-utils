declare global {

    namespace jest {

        // TODO generate automatically
        interface Matchers<R> {
            toEqualSparql(sparql: string): R;
            toEqualTurtle(turtle: string): R;
            toEqualJsonLD(jsonld: JsonLD): Promise<R>;
        }

    }

}
