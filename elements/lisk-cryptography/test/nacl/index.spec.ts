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
describe('nacl index.js', () => {
	let initialEnvVar: string | undefined;
	let sodiumMock: jest.Mock;
	let tweetMock: jest.Mock;

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
		sodiumMock = jest.fn().mockReturnValue([]);
		tweetMock = jest.fn().mockReturnValue([]);
		jest.mock('sodium-native', () => ({
			// eslint-disable-next-line camelcase
			randombytes_buf: sodiumMock,
		}));
		jest.mock('tweetnacl', () => ({
			randomBytes: tweetMock,
		}));
		// Reset environment variable
		delete process.env.NACL_FAST;
		jest.resetModules();
	});

	describe('nacl fast installed', () => {
		beforeEach(() => {
			delete process.env.NACL_FAST;
			jest.resetModules();
		});

		it('should load nacl fast if process.env.NACL_FAST is set to enable', () => {
			// Arrange
			process.env.NACL_FAST = 'enable';
			// Act
			// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
			const nacl = require('../../src/nacl');
			nacl.getRandomBytes(8);
			// Assert
			expect(sodiumMock).toHaveBeenCalledTimes(1);
		});

		it('should load nacl slow if process.env.NACL_FAST is set to disable', () => {
			// Arrange
			process.env.NACL_FAST = 'disable';
			// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
			const nacl = require('../../src/nacl');
			nacl.getRandomBytes(8);
			// Assert
			expect(tweetMock).toHaveBeenCalledTimes(1);
		});

		it('should load nacl fast if process.env.NACL_FAST is undefined', () => {
			// Arrange
			process.env.NACL_FAST = undefined;
			// Act
			// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
			const nacl = require('../../src/nacl');
			nacl.getRandomBytes(8);
			// Assert
			expect(sodiumMock).toHaveBeenCalledTimes(1);
		});
	});

	describe('nacl fast not installed', () => {
		beforeEach(() => {
			delete process.env.NACL_FAST;
			jest.resetModules();
		});

		it('should not set process.env.NACL_FAST to disable', () => {
			// eslint-disable-next-line global-require
			require('../../src/nacl');
			// Assert
			expect(process.env.NACL_FAST).not.toBe('disable');
		});

		it('should load nacl slow if process.env.NACL_FAST is set to disable', () => {
			// Arrange
			process.env.NACL_FAST = 'disable';

			// Act
			// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
			const nacl = require('../../src/nacl');
			nacl.getRandomBytes(8);
			// Assert
			expect(tweetMock).toHaveBeenCalledTimes(1);
		});
	});
});
