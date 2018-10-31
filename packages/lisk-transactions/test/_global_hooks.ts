import sinon from 'sinon';

declare global {
	export namespace NodeJS {
		export interface Global {
			sandbox: sinon.SinonSandbox;
		}
	}
	var sandbox: sinon.SinonSandbox;
}

afterEach(() => {
	return sandbox.restore();
});
