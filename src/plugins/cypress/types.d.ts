/// <reference types="cypress" />

import type { JsonLD } from '@/helpers/jsonld';

declare global {

    namespace Cypress {

        // TODO generate automatically
        interface Chainer<Subject> {
            (chainer: 'be.sparql', update: string): Cypress.Chainable<Subject>;
            (chainer: 'be.turtle', graph: string): Cypress.Chainable<Subject>;
            (chainer: 'be.jsonld', document: JsonLD): Cypress.Chainable<Subject>;
        }

    }

}
