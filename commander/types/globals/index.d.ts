/* tslint:disable:readonly-keyword */
/// <reference types="sinon" />

declare global {
	export namespace NodeJS {
		export interface Global {
			sandbox: sinon.SinonSandbox;
		}
	}
	var sandbox: sinon.SinonSandbox;
}

export {};
