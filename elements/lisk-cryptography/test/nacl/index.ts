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
import { when } from 'jest-when';
// Require is used for stubbing
const moduleLibrary = require('module');

const resetTest = () => {
	// Reset environment variable
	delete process.env.NACL_FAST;
	// Delete require cache to force it to re-load module
	delete require.cache[require.resolve('../../src/nacl')];
};

describe('nacl index.js', () => {
	let initialEnvVar: string | undefined;

	beforeAll(() => {
		initialEnvVar = process.env.NACL_FAST;
	});

	afterAll(() => {
		if (initialEnvVar) {
			process.env.NACL_FAST = initialEnvVar;
		} else {
			delete process.env.NACL_FAST;
		}
	});

	beforeEach(() => {
		resetTest();
	});

	describe('nacl fast installed', () => {
		beforeEach(() => {
			resetTest();
		});

		it('should load nacl fast if process.env.NACL_FAST is set to enable', async () => {
			// Arrange
			process.env.NACL_FAST = 'enable';
			const requireMock = jest.spyOn(moduleLibrary.prototype as any, 'require');
			// Act
			require('../../src/nacl');
			// Assert
			// Loading chain of Sodium-native module
			expect(requireMock).toBeCalledWith('fs');
			expect(requireMock).toBeCalledWith('path');
			expect(requireMock).toBeCalledWith('os');
		});

		it('should load nacl slow if process.env.NACL_FAST is set to disable', async () => {
			// Arrange
			process.env.NACL_FAST = 'disable';
			const requireMock = jest.spyOn(moduleLibrary.prototype as any, 'require');
			// Act
			require('../../src/nacl');
			// Assert
			expect(requireMock).toBeCalledWith('crypto');
		});

		it('should load nacl fast if process.env.NACL_FAST is undefined', async () => {
			// Arrange
			process.env.NACL_FAST = undefined;
			const requireMock = jest.spyOn(moduleLibrary.prototype as any, 'require');
			// Act
			require('../../src/nacl');
			// Assert
			// Loading chain of Sodium-native module
			expect(requireMock).toBeCalledWith('fs');
			expect(requireMock).toBeCalledWith('path');
			expect(requireMock).toBeCalledWith('os');
		});
	});

	describe('nacl fast not installed', () => {
		const moduleNotFoundError = new Error('MODULE_NOT_FOUND');

		beforeEach(() => {
			resetTest();
		});

		it('should set process.env.NACL_FAST to disable', async () => {
			const requireMock = jest.spyOn(moduleLibrary.prototype as any, 'require');

			when(requireMock)
				.calledWith('fs')
				.mockImplementation(() => {
					throw moduleNotFoundError;
				});

			require('../../src/nacl');
			expect(process.env.NACL_FAST).toEqual('disable');
		});

		it('should load nacl slow if process.env.NACL_FAST is set to disable', async () => {
			// Arrange
			process.env.NACL_FAST = 'disable';
			const requireMock = jest.spyOn(moduleLibrary.prototype as any, 'require');

			// Act
			require('../../src/nacl');

			// Assert
			expect(requireMock).toBeCalledWith('crypto');
		});
	});
});
