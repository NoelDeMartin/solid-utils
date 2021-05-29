import assertions from './assertions';

export function installChaiPlugin(): void {
    chai.use(_chai => Object.entries(assertions).forEach(([name, method]) => _chai.Assertion.addMethod(name, method)));
}
