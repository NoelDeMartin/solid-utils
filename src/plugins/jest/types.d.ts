declare global {

    namespace jest {

        // TODO generate automatically
        interface Matchers<R> {
            toEqualSparql(sparql: string): R;
        }

    }

}
