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
 */

'use strict';

const {
	stringToIpPortSet,
	stringToIpList,
	stringToDelegateList,
} = require('../../../../../../../../src/controller/validator/keywords/formatters');

describe('formatters', () => {
	describe('stringToIpPortSet', () => {
		it('should return empty array if given argument is not string', () => {
			// Arrange
			const input = 123;
			const expectedOutput = [];

			// Act
			const output = stringToIpPortSet(input);

			// Assert
			expect(output).toEqual(expectedOutput);
		});

		it('should return list of "ip" and "wsPort" objects for given string value', () => {
			// Arrange
			const input = '127.0.0.1:123,192.168.0.1:8000';
			const expectedOutput = [
				{ ip: '127.0.0.1', wsPort: 123 },
				{ ip: '192.168.0.1', wsPort: 8000 },
			];

			// Act
			const output = stringToIpPortSet(input);

			// Assert
			expect(output).toEqual(expectedOutput);
		});

		it('should return use 5000 was wsPort if not available in given argument', () => {
			// Arrange
			const input = '127.0.0.1,192.168.0.1:';
			const expectedOutput = [
				{ ip: '127.0.0.1', wsPort: 5000 },
				{ ip: '192.168.0.1', wsPort: 5000 },
			];

			// Act
			const output = stringToIpPortSet(input);

			// Assert
			expect(output).toEqual(expectedOutput);
		});
	});

	describe('stringToIpList', () => {
		it('should return empty array if given argument is not string', () => {
			// Arrange
			const input = 123;
			const expectedOutput = [];

			// Act
			const output = stringToIpList(input);

			// Assert
			expect(output).toEqual(expectedOutput);
		});

		it('should return list IPs for given string value', () => {
			// Arrange
			const input = '127.0.0.1,192.168.0.1';
			const expectedOutput = ['127.0.0.1', '192.168.0.1'];

			// Act
			const output = stringToIpList(input);

			// Assert
			expect(output).toEqual(expectedOutput);
		});
	});

	describe('stringToDelegateList', () => {
		it('should return empty array if given argument is not string', () => {
			// Arrange
			const input = 123;
			const expectedOutput = [];

			// Act
			const output = stringToDelegateList(input);

			// Assert
			expect(output).toEqual(expectedOutput);
		});

		it('should return list of "publicKey" and "encryptedPassphrase" objects for given string value', () => {
			// Arrange
			const input = 'key1|pass1,key2|pass2';
			const expectedOutput = [
				{ publicKey: 'key1', encryptedPassphrase: 'pass1' },
				{ publicKey: 'key2', encryptedPassphrase: 'pass2' },
			];

			// Act
			const output = stringToDelegateList(input);

			// Assert
			expect(output).toEqual(expectedOutput);
		});
	});
});
