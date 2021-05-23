// TODO generate automatically

declare global {

    namespace jest {

        interface Matchers<R> {
            toEqualSparql(sparql: string): R;
        }

    }

}
