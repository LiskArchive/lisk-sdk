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
import {
	getAddressFromPublicKey,
	getLisk32AddressFromPublicKey,
	getAddressFromPrivateKey,
	validateLisk32Address,
	getAddressFromLisk32Address,
	getLisk32AddressFromAddress,
} from '../src/address';
import {
	BASE32_CHARSET,
	DEFAULT_LISK32_ADDRESS_PREFIX,
	LISK32_ADDRESS_LENGTH,
} from '../src/constants';
import * as utils from '../src/utils';

describe('address', () => {
	const defaultPassphraseHash = '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b';
	const defaultPrivateKey = Buffer.from(
		'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		'hex',
	);
	const defaultPublicKey = Buffer.from(
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		'hex',
	);
	const defaultAddress = Buffer.from('2bb80d537b1da3e38bd30361aa855686bde0eacd', 'hex');

	beforeEach(() => {
		jest.spyOn(utils, 'hash').mockReturnValue(Buffer.from(defaultPassphraseHash, 'hex'));
	});

	describe('#getAddressFromPrivateKey', () => {
		it('should create correct address', () => {
			expect(getAddressFromPrivateKey(defaultPrivateKey.slice(0, 64))).toEqual(defaultAddress);
		});
	});

	describe('#getAddressFromPublicKey', () => {
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
		const hash = 'c247a42e09e6aafd818821f75b2f5b0de47c8235';
		const expectedLisk32Address = 'lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu';
		beforeEach(() => {
			return jest.spyOn(utils, 'hash').mockReturnValue(Buffer.from(hash, 'hex'));
		});

		it('should generate lisk32 address from publicKey', () => {
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
				expect(() => validateLisk32Address(address)).toThrow(
					`Address length does not match requirements. Expected ${LISK32_ADDRESS_LENGTH} characters.`,
				);
			});
		});

		describe('Given an address that is too long', () => {
			const address = 'lskoaknq582o6fw7sp82bm2hnj7pzp47mpmbmux2ga';
			it('should throw an error', () => {
				expect(() => validateLisk32Address(address)).toThrow(
					`Address length does not match requirements. Expected ${LISK32_ADDRESS_LENGTH} characters.`,
				);
			});
		});

		describe('Given an address that is not prefixed with `lsk`', () => {
			const address = 'LSK24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu';
			it('should throw an error', () => {
				expect(() => validateLisk32Address(address)).toThrow(
					`Invalid address prefix. Actual prefix: LSK, Expected prefix: ${DEFAULT_LISK32_ADDRESS_PREFIX}`,
				);
			});
		});

		describe('Given an address containing non-lisk32 characters', () => {
			const address = 'lsk1aknq582o6fw7sp82bm2hnj7pzp47mpmbmux2g';
			it('should throw an error', () => {
				expect(() => validateLisk32Address(address)).toThrow(
					`Invalid character found in address. Only allow characters: '${BASE32_CHARSET}'.`,
				);
			});
		});

		describe('Given an address with invalid checksum', () => {
			const address = 'lskoaknq582o6fw7sp82bm2hnj7pzp47mpmbmuxgg';
			it('should throw an error', () => {
				expect(() => validateLisk32Address(address)).toThrow('Invalid checksum for address.');
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
			return expect(getAddressFromLisk32Address.bind(null, 'invalid')).toThrow();
		});

		it('should throw error for invalid prefix', () => {
			expect(() =>
				getAddressFromLisk32Address('abcvtr2zq9v36vyefjdvhxas92nf438z9ap8wnzav').toString('hex'),
			).toThrow(
				`Invalid address prefix. Actual prefix: abc, Expected prefix: ${DEFAULT_LISK32_ADDRESS_PREFIX}`,
			);
		});

		it('should return an address given a lisk32 address with default prefix', () => {
			expect(getAddressFromLisk32Address(account.address).toString('hex')).toBe(
				account.binaryAddress,
			);
		});

		it('should return an address given a lisk32 address with custom prefix', () => {
			expect(
				getAddressFromLisk32Address('abcvtr2zq9v36vyefjdvhxas92nf438z9ap8wnzav', 'abc').toString(
					'hex',
				),
			).toBe('14e58055a242851b7b9a17439db707f250f03724');
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

		it('should return lisk32 address given an address', () => {
			expect(getLisk32AddressFromAddress(Buffer.from(account.binaryAddress, 'hex'))).toBe(
				account.address,
			);
		});
	});
});
