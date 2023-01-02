/*
 * Copyright © 2020 Lisk Foundation
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

import { cryptography } from '../../src';

const {
	address: {
		getAddressFromPublicKey,
		getLisk32AddressFromPublicKey,
		getAddressFromPrivateKey,
		validateLisk32Address,
		getAddressFromLisk32Address,
		getLisk32AddressFromAddress,
	},
} = cryptography;

describe('keys', () => {
	const defaultPrivateKey = Buffer.from(
		'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		'hex',
	);
	const defaultPublicKey = Buffer.from(
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		'hex',
	);
	const defaultAddress = Buffer.from('3a971fd02b4a07fc20aad1936d3cb1d263b96e0f', 'hex');

	describe('#getAddressFromPrivateKey', () => {
		it('should create correct address', () => {
			expect(getAddressFromPrivateKey(defaultPrivateKey.slice(0, 64))).toEqual(defaultAddress);
		});
	});

	describe('#address.getAddressFromPublicKey', () => {
		it('should generate address from publicKey', () => {
			const address = getAddressFromPublicKey(defaultPublicKey);
			expect(address).toEqual(defaultAddress);
		});
	});

	describe('#getLisk32AddressFromPublicKey', () => {
		const publicKey = Buffer.from(
			'0eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243',
			'hex',
		);
		const expectedLisk32Address = 'lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu';

		it('should generate base32 address from publicKey', () => {
			const address = getLisk32AddressFromPublicKey(publicKey, 'lsk');

			expect(address).toBe(expectedLisk32Address);
		});
	});

	describe('#validateLisk32Address', () => {
		describe('Given valid addresses', () => {
			const addresses = [
				'lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu',
				'lskoaknq582o6fw7sp82bm2hnj7pzp47mpmbmux2g',
				'lskqf5xbhu874yqg89k449zk2fctj46fona9bafgr',
				'lskamc9kfzenupkgexyxsf4qz9fv8mo9432of9p5j',
				'lsk6xevdsz3dpqfsx2u6mg3jx9zk8xqdozvn7x5ur',
			];

			it('should not throw', () => {
				addresses.forEach(address => {
					expect(() => validateLisk32Address(address)).not.toThrow();
				});
			});
		});

		describe('Given an address that is too short', () => {
			const address = 'lsk1';
			it('should throw an error', () => {
				expect(validateLisk32Address.bind(null, address)).toThrow(
					'Address length does not match requirements. Expected 41 characters.',
				);
			});
		});

		describe('Given an address that is too long', () => {
			const address = 'lskoaknq582o6fw7sp82bm2hnj7pzp47mpmbmux2ga';
			it('should throw an error', () => {
				expect(validateLisk32Address.bind(null, address)).toThrow(
					'Address length does not match requirements. Expected 41 characters.',
				);
			});
		});

		describe('Given an address that is not prefixed with `lsk`', () => {
			const address = 'LSK24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu';
			it('should throw an error', () => {
				expect(validateLisk32Address.bind(null, address)).toThrow(
					'Invalid address prefix. Actual prefix: LSK, Expected prefix: lsk',
				);
			});
		});

		describe('Given an address containing non-base32 characters', () => {
			const address = 'lsk1aknq582o6fw7sp82bm2hnj7pzp47mpmbmux2g';
			it('should throw an error', () => {
				expect(validateLisk32Address.bind(null, address)).toThrow(
					"Invalid character found in address. Only allow characters: 'zxvcpmbn3465o978uyrtkqew2adsjhfg'.",
				);
			});
		});

		describe('Given an address with invalid checksum', () => {
			const address = 'lskoaknq582o6fw7sp82bm2hnj7pzp47mpmbmuxgg';
			it('should throw an error', () => {
				expect(validateLisk32Address.bind(null, address)).toThrow('Invalid checksum for address.');
			});
		});
	});

	describe('getAddressFromLisk32Address', () => {
		const account = {
			passphrase:
				'boil typical oyster traffic ethics timber envelope undo lecture poverty space keep',
			privateKey:
				'b02cd384aae38021bc025522aca7a015b64ff1ac2e47426b5bc749951273fdbc81d0db4fba38f3ce334e6c0f3192dd62366f43daa46a94bfc55ebf6205ea2453',
			publicKey: '81d0db4fba38f3ce334e6c0f3192dd62366f43daa46a94bfc55ebf6205ea2453',
			binaryAddress: '4762070a641cf689f765d43ad792e1970e6bb863',
			address: 'lsk3hyz7vtpcts3thsmduh98pwxrjnbw7ccoxchxu',
		};

		it('should throw error for invalid address', () => {
			expect(getAddressFromLisk32Address.bind(null, 'invalid')).toThrow();
		});

		it('should return an address given a base32 address', () => {
			expect(getAddressFromLisk32Address(account.address).toString('hex')).toBe(
				account.binaryAddress,
			);
		});
	});

	describe('getLisk32AddressFromAddress', () => {
		const account = {
			passphrase:
				'boil typical oyster traffic ethics timber envelope undo lecture poverty space keep',
			privateKey:
				'b02cd384aae38021bc025522aca7a015b64ff1ac2e47426b5bc749951273fdbc81d0db4fba38f3ce334e6c0f3192dd62366f43daa46a94bfc55ebf6205ea2453',
			publicKey: '81d0db4fba38f3ce334e6c0f3192dd62366f43daa46a94bfc55ebf6205ea2453',
			binaryAddress: '4762070a641cf689f765d43ad792e1970e6bb863',
			address: 'lsk3hyz7vtpcts3thsmduh98pwxrjnbw7ccoxchxu',
		};

		it('should return base32 address given an address', () => {
			expect(getLisk32AddressFromAddress(Buffer.from(account.binaryAddress, 'hex'))).toBe(
				account.address,
			);
		});
	});
});
