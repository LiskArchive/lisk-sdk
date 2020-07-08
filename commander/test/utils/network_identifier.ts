/*
 * LiskHQ/lisk-commander
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
import { getNetworkIdentifierWithInput } from '../../src/utils/network_identifier';

describe('network identifier utils', () => {
	describe('getNetworkIdentifierWithInput', () => {
		const mainnetNetworkIdentifier = Buffer.from(
			'5a59db36ca7de3cbb4bf27f95665e86952ccc66f8bf7ce8f6f6b3561b920f801',
			'hex',
		).toString('base64');
		const testnetNetworkIdentifier = Buffer.from(
			'10f236f6d00a8f565bbe43c4ef0e3818f488bf4abefbe041155a3d019ef9a947',
			'hex',
		).toString('base64');
		const defaultNetworkIdentifier = Buffer.from(
			'7777777777777777777777777777777777777777777777777777777777777777',
			'hex',
		).toString('base64');

		describe('when input main is defined', () => {
			it('should return mainnet network identifier', () => {
				const result = getNetworkIdentifierWithInput('main', 'test');
				expect(result).to.eql(mainnetNetworkIdentifier);
			});
		});

		describe('when input test is defined', () => {
			it('should return testnet network identifier', () => {
				const result = getNetworkIdentifierWithInput('test', 'main');
				expect(result).to.eql(testnetNetworkIdentifier);
			});
		});

		describe('when input network identifier hex is defined', () => {
			it('should return hex value', () => {
				const result = getNetworkIdentifierWithInput(defaultNetworkIdentifier, 'main');
				expect(result).to.eql(defaultNetworkIdentifier);
			});
		});

		describe('when input network identifier is not valid base64 string', () => {
			it('should throw error', () => {
				let error;
				try {
					getNetworkIdentifierWithInput('!!!non-base64', 'main');
				} catch (err) {
					error = err;
				}

				expect(error.message).to.eql('Network identifier must be base64 string');
			});
		});

		describe('when input is undefined and network config is main', () => {
			it('should return mainnet network identifier', () => {
				const result = getNetworkIdentifierWithInput(undefined, 'main');
				expect(result).to.eql(mainnetNetworkIdentifier);
			});
		});

		describe('when input is undefined and network config is test', () => {
			it('should return mainnet network identifier', () => {
				const result = getNetworkIdentifierWithInput(undefined, 'test');
				expect(result).to.eql(testnetNetworkIdentifier);
			});
		});

		describe('when input is undefined and network config is undefined', () => {
			it('should throw error', () => {
				let err;
				try {
					getNetworkIdentifierWithInput(undefined, undefined);
				} catch (error) {
					err = error;
				}
				expect(err.message).to.equal('Invalid network identifier');
			});
		});
	});
});
