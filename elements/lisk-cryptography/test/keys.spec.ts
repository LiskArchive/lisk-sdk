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
	Keypair,
	KeypairBytes,
	getBase32AddressFromPublicKey,
	getBinaryAddressFromPublicKey,
	getPrivateAndPublicKeyFromPassphrase,
	getPrivateAndPublicKeyBytesFromPassphrase,
	getKeys,
	getAddressAndPublicKeyFromPassphrase,
	getAddressFromPassphrase,
	getAddressFromPrivateKey,
	validateBase32Address,
} from '../src/keys';
// Require is used for stubbing
// eslint-disable-next-line
const buffer = require('../src/buffer');
// eslint-disable-next-line
const hashModule = require('../src/hash');

describe('keys', () => {
	const defaultPassphrase = 'secret';
	const defaultPassphraseHash =
		'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b';
	const defaultPrivateKey =
		'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultPublicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultAddress = '2bb80d537b1da3e38bd30361aa855686bde0eacd';
	const defaultAddressAndPublicKey = {
		publicKey: defaultPublicKey,
		address: defaultAddress,
	};

	beforeEach(() => {
		jest.spyOn(buffer, 'bufferToHex');

		jest
			.spyOn(hashModule, 'hash')
			.mockReturnValue(Buffer.from(defaultPassphraseHash, 'hex'));
	});

	describe('#getPrivateAndPublicKeyBytesFromPassphrase', () => {
		let keyPair: KeypairBytes;

		beforeEach(() => {
			keyPair = getPrivateAndPublicKeyBytesFromPassphrase(defaultPassphrase);
		});

		it('should create buffer publicKey', () => {
			expect(Buffer.from(keyPair.publicKeyBytes).toString('hex')).toBe(
				defaultPublicKey,
			);
		});

		it('should create buffer privateKey', () => {
			expect(Buffer.from(keyPair.privateKeyBytes).toString('hex')).toBe(
				defaultPrivateKey,
			);
		});
	});

	describe('#getPrivateAndPublicKeyFromPassphrase', () => {
		let keyPair: Keypair;

		beforeEach(() => {
			keyPair = getPrivateAndPublicKeyFromPassphrase(defaultPassphrase);
		});

		it('should generate the correct publicKey from a passphrase', () => {
			expect(keyPair).toHaveProperty('publicKey', defaultPublicKey);
		});

		it('should generate the correct privateKey from a passphrase', () => {
			expect(keyPair).toHaveProperty('privateKey', defaultPrivateKey);
		});
	});

	describe('#getKeys', () => {
		let keyPair: Keypair;

		beforeEach(() => {
			keyPair = getKeys(defaultPassphrase);
		});

		it('should generate the correct publicKey from a passphrase', () => {
			expect(keyPair).toHaveProperty('publicKey', defaultPublicKey);
		});

		it('should generate the correct privateKey from a passphrase', () => {
			expect(keyPair).toHaveProperty('privateKey', defaultPrivateKey);
		});
	});

	describe('#getAddressAndPublicKeyFromPassphrase', () => {
		it('should create correct address and publicKey', () => {
			expect(getAddressAndPublicKeyFromPassphrase(defaultPassphrase)).toEqual(
				defaultAddressAndPublicKey,
			);
		});
	});

	describe('#getAddressFromPassphrase', () => {
		it('should create correct address', () => {
			expect(getAddressFromPassphrase(defaultPassphrase)).toBe(defaultAddress);
		});
	});

	describe('#getAddressFromPrivateKey', () => {
		it('should create correct address', () => {
			expect(getAddressFromPrivateKey(defaultPrivateKey.slice(0, 64))).toBe(
				defaultAddress,
			);
		});
	});

	describe('#getBinaryAddressFromPublicKey', () => {
		const publicKey =
			'0eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243';
		const hash = 'c247a42e09e6aafd818821f75b2f5b0de47c8235';
		const expectedBinaryAddress = 'c247a42e09e6aafd818821f75b2f5b0de47c8235';
		beforeEach(() => {
			return jest
				.spyOn(hashModule, 'hash')
				.mockReturnValue(Buffer.from(hash, 'hex'));
		});

		it('should generate address from publicKey', () => {
			const address = getBinaryAddressFromPublicKey(publicKey);

			expect(address.compare(Buffer.from(expectedBinaryAddress, 'hex'))).toBe(
				0,
			);
		});
	});

	describe('#getBase32AddressFromPublicKey', () => {
		const publicKey =
			'0eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243';
		const hash = 'c247a42e09e6aafd818821f75b2f5b0de47c8235';
		const expectedBase32Address = 'lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu';
		beforeEach(() => {
			return jest
				.spyOn(hashModule, 'hash')
				.mockReturnValue(Buffer.from(hash, 'hex'));
		});

		it('should generate base32 address from publicKey', () => {
			const address = getBase32AddressFromPublicKey(publicKey, 'lsk');

			expect(address).toBe(expectedBase32Address);
		});
	});

	describe('#validateBase32Address', () => {
		describe('Given valid addresses', () => {
			const addresses = [
				'lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu',
				'lskoaknq582o6fw7sp82bm2hnj7pzp47mpmbmux2g',
				'lskqf5xbhu874yqg89k449zk2fctj46fona9bafgr',
				'lskamc9kfzenupkgexyxsf4qz9fv8mo9432of9p5j',
				'lsk6xevdsz3dpqfsx2u6mg3jx9zk8xqdozvn7x5ur',
			];

			it('should return true', () => {
				return addresses.forEach(address => {
					return expect(validateBase32Address(address)).toBeTrue();
				});
			});
		});

		describe('Given an address that is too short', () => {
			const address = 'lsk1';
			it('should throw an error', () => {
				return expect(validateBase32Address.bind(null, address)).toThrow(
					'Address length does not match requirements. Expected 41 characters.',
				);
			});
		});

		describe('Given an address that is too long', () => {
			const address = 'lskoaknq582o6fw7sp82bm2hnj7pzp47mpmbmux2ga';
			it('should throw an error', () => {
				return expect(validateBase32Address.bind(null, address)).toThrow(
					'Address length does not match requirements. Expected 41 characters.',
				);
			});
		});

		describe('Given an address that is not prefixed with `lsk`', () => {
			const address = 'LSK24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu';
			it('should throw an error', () => {
				return expect(validateBase32Address.bind(null, address)).toThrow(
					'Invalid prefix. Expected prefix: lsk',
				);
			});
		});

		describe('Given an address containing non-base32 characters', () => {
			const address = 'lsk1aknq582o6fw7sp82bm2hnj7pzp47mpmbmux2g';
			it('should throw an error', () => {
				return expect(validateBase32Address.bind(null, address)).toThrow(
					`Invalid character found in address. Only allow characters: 'abcdefghjkmnopqrstuvwxyz23456789'.`,
				);
			});
		});

		describe('Given an address with invalid checksum', () => {
			const address = 'lskoaknq582o6fw7sp82bm2hnj7pzp47mpmbmuxgg';
			it('should throw an error', () => {
				return expect(validateBase32Address.bind(null, address)).toThrow(
					`Invalid checksum for address.`,
				);
			});
		});
	});
});
