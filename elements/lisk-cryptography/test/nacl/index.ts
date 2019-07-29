/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
import { expect } from 'chai';
import { NaclInterface } from '../../src/nacl/nacl_types';
import * as fast from '../../src/nacl/fast';
import * as slow from '../../src/nacl/slow';
// Require is used for stubbing
const moduleLibrary = require('module');

const resetTest = () => {
	// Reset environment variable
	delete process.env.NACL_FAST;
	// Delete require cache to force it to re-load module
	delete require.cache[require.resolve('../../src/nacl')];
};

interface naclLibrary extends NaclInterface {
	NACL_SIGN_PUBLICKEY_LENGTH: number;
	NACL_SIGN_SIGNATURE_LENGTH: number;
}

const stripConstants = (library: naclLibrary) => {
	// Constants are added in ../../src/nacl/index.js
	const {
		NACL_SIGN_PUBLICKEY_LENGTH,
		NACL_SIGN_SIGNATURE_LENGTH,
		...strippedLib
	} = library;
	return strippedLib;
};

describe('nacl index.js', () => {
	let initialEnvVar: string | undefined;
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

	describe('nacl fast installed', () => {
		beforeEach(() => {
			resetTest();
			return Promise.resolve();
		});

		it('should load nacl fast if process.env.NACL_FAST is set to enable', () => {
			process.env.NACL_FAST = 'enable';
			const loadedLibrary = require('../../src/nacl');
			const strippedLibrary = stripConstants(loadedLibrary);
			return expect(strippedLibrary).to.be.eql(fast);
		});

		it('should load nacl slow if process.env.NACL_FAST is set to disable', () => {
			process.env.NACL_FAST = 'disable';
			const loadedLibrary = require('../../src/nacl');
			const strippedLibrary = stripConstants(loadedLibrary);
			return expect(strippedLibrary).to.be.eql(slow);
		});

		it('should load nacl fast if process.env.NACL_FAST is undefined', () => {
			process.env.NACL_FAST = undefined;
			const loadedLibrary = require('../../src/nacl');
			const strippedLibrary = stripConstants(loadedLibrary);
			return expect(strippedLibrary).to.be.eql(fast);
		});
	});

	describe('nacl fast not installed', () => {
		const moduleNotFoundError = new Error('MODULE_NOT_FOUND');
		beforeEach(() => {
			resetTest();

			// "require" is a wrapper around Module._load which handles the actual loading
			sandbox
				.stub(moduleLibrary, '_load')
				.callThrough()
				.withArgs('./fast')
				.throws(moduleNotFoundError);
			return Promise.resolve();
		});

		it('should set process.env.NACL_FAST to disable', () => {
			require('../../src/nacl');
			return expect(process.env.NACL_FAST).to.eql('disable');
		});

		it('should load nacl slow if process.env.NACL_FAST is set to enable', () => {
			process.env.NACL_FAST = 'enable';
			const loadedLibrary = require('../../src/nacl');
			const strippedLibrary = stripConstants(loadedLibrary);
			return expect(strippedLibrary).to.eql(slow);
		});

		it('should load nacl slow if process.env.NACL_FAST is set to disable', () => {
			process.env.NACL_FAST = 'disable';
			const loadedLibrary = require('../../src/nacl');
			const strippedLibrary = stripConstants(loadedLibrary);
			return expect(strippedLibrary).to.eql(slow);
		});

		it('should load nacl slow if process.env.NACL_FAST is undefined', () => {
			process.env.NACL_FAST = undefined;
			const loadedLibrary = require('../../src/nacl');
			const strippedLibrary = stripConstants(loadedLibrary);
			return expect(strippedLibrary).to.eql(slow);
		});
	});
});
