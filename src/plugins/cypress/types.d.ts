/// <reference types="cypress" />

declare global {

    namespace Cypress {

        // TODO generate automatically
        interface Chainer<Subject> {
            (chainer: 'be.sparql', update: string): Cypress.Chainable<Subject>;
        }

    }

}
