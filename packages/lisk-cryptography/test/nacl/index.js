import * as fast from '../../src/nacl/fast';
import * as slow from '../../src/nacl/slow';
// Require is used for stubbing
// eslint-disable-next-line
const _module = require('module');

const resetTest = () => {
	// Reset environment variable
	delete process.env.NACL_FAST;
	// Delete require cache to force it to re-load module
	delete require.cache[require.resolve('../../src/nacl/index')];
};

const removeConstants = lib => {
	// Constants are added in /src/index.js
	// eslint-disable-next-line
	delete lib.NACL_SIGN_PUBLICKEY_LENGTH;
	// eslint-disable-next-line
	delete lib.NACL_SIGN_SIGNATURE_LENGTH;
	return lib;
};

describe('nacl index.js', () => {
	let loadedLibrary;
	// Store current env variable and set it back after tests are run
	let initialEnvVar;
	before(() => {
		initialEnvVar = process.env.NACL_FAST;
		return Promise.resolve();
	});

	after(() => {
		if (initialEnvVar) {
			process.env.NACL_FAST = initialEnvVar;
		} else {
			delete process.env.NACL_FAST;
		}
		return Promise.resolve();
	});

	beforeEach(() => {
		resetTest();
		return Promise.resolve();
	});

	it('should load nacl slow if process.env.NACL_FAST is set to disable', () => {
		process.env.NACL_FAST = 'disable';
		// eslint-disable-next-line
		loadedLibrary = require('../../src/nacl/index');
		loadedLibrary = removeConstants(loadedLibrary);
		return expect(loadedLibrary).to.be.eql(slow);
	});

	describe('nacl fast installed', () => {
		beforeEach(() => {
			resetTest();
			return Promise.resolve();
		});

		it('should load nacl fast if process.env.NACL_FAST is set to enable', () => {
			process.env.NACL_FAST = 'enable';
			// eslint-disable-next-line
			loadedLibrary = require('../../src/nacl/index');
			loadedLibrary = removeConstants(loadedLibrary);
			return expect(loadedLibrary).to.be.eql(fast);
		});

		it('should load nacl slow if process.env.NACL_FAST is set to disable', () => {
			process.env.NACL_FAST = 'disable';
			// eslint-disable-next-line
			loadedLibrary = require('../../src/nacl/index');
			loadedLibrary = removeConstants(loadedLibrary);
			return expect(loadedLibrary).to.be.eql(slow);
		});

		it('should load nacl fast if process.env.NACL_FAST is undefined', () => {
			process.env.NACL_FAST = undefined;
			// eslint-disable-next-line
			loadedLibrary = require('../../src/nacl/index');
			loadedLibrary = removeConstants(loadedLibrary);
			return expect(loadedLibrary).to.be.eql(fast);
		});
	});

	describe('nacl fast not installed', () => {
		const moduleNotFoundError = new Error('MODULE_NOT_FOUND');
		beforeEach(() => {
			resetTest();
			// "require" is a wrapper around Module._load which handles the actual loading
			sandbox
				.stub(_module, '_load')
				.callThrough()
				.withArgs('./fast')
				.throws(moduleNotFoundError);
			return Promise.resolve();
		});

		it('should load nacl slow if process.env.NACL_FAST is set to enable', () => {
			process.env.NACL_FAST = 'enable';
			// eslint-disable-next-line
			loadedLibrary = require('../../src/nacl/index');
			loadedLibrary = removeConstants(loadedLibrary);
			return expect(loadedLibrary).to.eql(slow);
		});

		it('should load nacl slow if process.env.NACL_FAST is set to disable', () => {
			process.env.NACL_FAST = 'disable';
			// eslint-disable-next-line
			loadedLibrary = require('../../src/nacl/index');
			loadedLibrary = removeConstants(loadedLibrary);
			return expect(loadedLibrary).to.eql(slow);
		});

		it('should load nacl slow if process.env.NACL_FAST is undefined', () => {
			process.env.NACL_FAST = undefined;
			// eslint-disable-next-line
			loadedLibrary = require('../../src/nacl/index');
			loadedLibrary = removeConstants(loadedLibrary);
			return expect(loadedLibrary).to.eql(slow);
		});
	});
});
