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
		const mainnetNetworkIdentifier =
			'9ee11e9df416b18bf69dbd1a920442e08c6ca319e69926bc843a561782ca17ee';
		const testnetNetworkIdentifier =
			'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';
		const defaultNetworkIdentifier =
			'7777777777777777777777777777777777777777777777777777777777777777';

		describe('when input main is defined', () => {
			it('should return mainnet network identifier', async () => {
				const result = getNetworkIdentifierWithInput('main', 'test');
				expect(result).to.eql(mainnetNetworkIdentifier);
			});
		});

		describe('when input test is defined', () => {
			it('should return testnet network identifier', async () => {
				const result = getNetworkIdentifierWithInput('test', 'main');
				expect(result).to.eql(testnetNetworkIdentifier);
			});
		});

		describe('when input network identifier hex is defined', () => {
			it('should return hex value', async () => {
				const result = getNetworkIdentifierWithInput(
					defaultNetworkIdentifier,
					'main',
				);
				expect(result).to.eql(defaultNetworkIdentifier);
			});
		});

		describe('when input network identifier is not valid hex string', () => {
			it('should throw error', async () => {
				let error;
				try {
					getNetworkIdentifierWithInput('zzz', 'main');
				} catch (err) {
					error = err;
				}

				expect(error.message).to.eql('Network identifier must be hex string');
			});
		});

		describe('when input is undefined and network config is main', () => {
			it('should return mainnet network identifier', async () => {
				const result = getNetworkIdentifierWithInput(undefined, 'main');
				expect(result).to.eql(mainnetNetworkIdentifier);
			});
		});

		describe('when input is undefined and network config is test', () => {
			it('should return mainnet network identifier', async () => {
				const result = getNetworkIdentifierWithInput(undefined, 'test');
				expect(result).to.eql(testnetNetworkIdentifier);
			});
		});

		describe('when input is undefined and network config is undefined', () => {
			it('should throw error', async () => {
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
