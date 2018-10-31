/* tslint:disable:readonly-keyword no-namespace */
/// <reference types="sinon" />
declare namespace NodeJS {
	export interface Global {
		sandbox: sinon.SinonSandbox;
	}
}
