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
	getPrivateAndPublicKeyFromPassphrase,
	getPrivateAndPublicKeyBytesFromPassphrase,
	getKeys,
	getAddressAndPublicKeyFromPassphrase,
	getAddressFromPassphrase,
	getAddressFromPrivateKey,
} from '../src/keys';
// Require is used for stubbing
const buffer = require('../src/buffer');
const hashModule = require('../src/hash');

describe('keys', () => {
	const defaultPassphrase = 'secret';
	const defaultPassphraseHash =
		'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b';
	const defaultPrivateKey =
		'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultPublicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultAddress = '16402986683325069355L';
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

		test('should create buffer publicKey', () => {
			expect(Buffer.from(keyPair.publicKeyBytes).toString('hex')).toBe(
				defaultPublicKey,
			);
		});

		test('should create buffer privateKey', () => {
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

		test('should generate the correct publicKey from a passphrase', () => {
			expect(keyPair).toHaveProperty('publicKey', defaultPublicKey);
		});

		test('should generate the correct privateKey from a passphrase', () => {
			expect(keyPair).toHaveProperty('privateKey', defaultPrivateKey);
		});
	});

	describe('#getKeys', () => {
		let keyPair: Keypair;

		beforeEach(() => {
			keyPair = getKeys(defaultPassphrase);
		});

		test('should generate the correct publicKey from a passphrase', () => {
			expect(keyPair).toHaveProperty('publicKey', defaultPublicKey);
		});

		test('should generate the correct privateKey from a passphrase', () => {
			expect(keyPair).toHaveProperty('privateKey', defaultPrivateKey);
		});
	});

	describe('#getAddressAndPublicKeyFromPassphrase', () => {
		test('should create correct address and publicKey', () => {
			expect(getAddressAndPublicKeyFromPassphrase(defaultPassphrase)).toEqual(
				defaultAddressAndPublicKey,
			);
		});
	});

	describe('#getAddressFromPassphrase', () => {
		test('should create correct address', () => {
			expect(getAddressFromPassphrase(defaultPassphrase)).toBe(defaultAddress);
		});
	});

	describe('#getAddressFromPrivateKey', () => {
		test('should create correct address', () => {
			expect(getAddressFromPrivateKey(defaultPrivateKey.slice(0, 64))).toBe(
				defaultAddress,
			);
		});
	});
});
