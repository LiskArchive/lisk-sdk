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
import { registerSecondPassphrase } from '../src/register_second_passphrase';
import { SecondSignatureAsset } from '../src/9_second_signature_transaction';
import { TransactionJSON } from '../src/transaction_types';
import * as time from '../src/utils/time';

describe('#registerSecondPassphrase transaction', () => {
	const fixedPoint = 10 ** 8;
	const passphrase = 'secret';
	const secondPassphrase = 'second secret';
	const transactionType = 9;
	const publicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const secondPublicKey =
		'0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const emptyStringPublicKey =
		'be907b4bac84fee5ce8811db2defc9bf0b2a2a2bbc3d54d8a2257ecd70441962';
	const secondPassphraseFee = (5 * fixedPoint).toString();
	const timeWithOffset = 38350076;
	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	let getTimeWithOffsetStub: jest.SpyInstance;
	let registerSecondPassphraseTransaction: Partial<TransactionJSON>;

	beforeEach(() => {
		getTimeWithOffsetStub = jest
			.spyOn(time, 'getTimeWithOffset')
			.mockReturnValue(timeWithOffset);
		registerSecondPassphraseTransaction = registerSecondPassphrase({
			networkIdentifier,
			passphrase,
			secondPassphrase,
		});
		return Promise.resolve();
	});

	it('should create a register second passphrase transaction', () => {
		return expect(registerSecondPassphraseTransaction).toBeTruthy();
	});

	it('should use time.getTimeWithOffset to calculate the timestamp', () => {
		return expect(getTimeWithOffsetStub).toHaveBeenCalledWith(undefined);
	});

	it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
		const offset = -10;
		registerSecondPassphrase({
			networkIdentifier,
			passphrase,
			secondPassphrase,
			timeOffset: offset,
		});

		return expect(getTimeWithOffsetStub).toHaveBeenCalledWith(offset);
	});

	describe('returned register second passphrase transaction', () => {
		it('should be an object', () => {
			return expect(registerSecondPassphraseTransaction).toBeObject();
		});

		it('should have an id string', () => {
			return expect(registerSecondPassphraseTransaction.id).toBeString();
		});

		it('should have type number equal to 1', () => {
			return expect(registerSecondPassphraseTransaction).toHaveProperty(
				'type',
				transactionType,
			);
		});

		it('should have fee string equal to second passphrase fee', () => {
			return expect(registerSecondPassphraseTransaction).toHaveProperty(
				'fee',
				secondPassphraseFee,
			);
		});

		it('should have senderPublicKey hex string equal to sender public key', () => {
			return expect(registerSecondPassphraseTransaction).toHaveProperty(
				'senderPublicKey',
				publicKey,
			);
		});

		it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
			return expect(registerSecondPassphraseTransaction).toHaveProperty(
				'timestamp',
				timeWithOffset,
			);
		});

		it('should have signature hex string', () => {
			return expect(registerSecondPassphraseTransaction.signature).toBeString();
		});

		it('should have asset object', () => {
			return expect(
				Object.keys(registerSecondPassphraseTransaction),
			).not.toHaveLength(0);
		});

		it('should have an undefined signSignature property', () => {
			return expect(
				registerSecondPassphraseTransaction.signSignature,
			).toBeUndefined();
		});

		describe('signature asset', () => {
			it('should have a 32-byte publicKey hex string', () => {
				expect(
					(registerSecondPassphraseTransaction.asset as any).publicKey,
				).toBeString();
				const {
					publicKey,
				} = registerSecondPassphraseTransaction.asset as SecondSignatureAsset;
				return expect(Buffer.from(publicKey, 'hex')).toHaveLength(32);
			});

			it('should have a publicKey equal to the public key for the provided second passphrase', () => {
				return expect(registerSecondPassphraseTransaction.asset).toHaveProperty(
					'publicKey',
					secondPublicKey,
				);
			});

			it('should have the correct publicKey if the provided second passphrase is an empty string', () => {
				registerSecondPassphraseTransaction = registerSecondPassphrase({
					networkIdentifier,
					passphrase,
					secondPassphrase: '',
				});
				const {
					publicKey,
				} = registerSecondPassphraseTransaction.asset as SecondSignatureAsset;
				return expect(publicKey).toBe(emptyStringPublicKey);
			});
		});
	});

	describe('unsigned register second passphrase transaction', () => {
		describe('when the register second passphrase transaction is created without a passphrase', () => {
			beforeEach(() => {
				registerSecondPassphraseTransaction = registerSecondPassphrase({
					networkIdentifier,
					secondPassphrase,
				});
				return Promise.resolve();
			});

			it('should throw error when secondPassphrase was not provided', () => {
				return expect(
					registerSecondPassphrase.bind(null, {} as any),
				).toThrowError('Please provide a secondPassphrase. Expected string.');
			});

			it('should not throw error when secondPassphrase is empty string', () => {
				return expect(
					registerSecondPassphrase.bind(null, {
						networkIdentifier,
						secondPassphrase: '',
					}),
				).not.toThrowError();
			});

			it('should have the type', () => {
				return expect(registerSecondPassphraseTransaction).toHaveProperty(
					'type',
					transactionType,
				);
			});

			it('should have the sender public key', () => {
				return expect(registerSecondPassphraseTransaction).toHaveProperty(
					'senderPublicKey',
					undefined,
				);
			});

			it('should have the timestamp', () => {
				return expect(registerSecondPassphraseTransaction).toHaveProperty(
					'timestamp',
				);
			});

			it('should have the asset with the signature with the public key', () => {
				return expect(
					(registerSecondPassphraseTransaction.asset as any).publicKey,
				).toBeString();
			});

			it('should not have the signature', () => {
				return expect(registerSecondPassphraseTransaction).not.toHaveProperty(
					'signature',
				);
			});

			it('should not have the id', () => {
				return expect(registerSecondPassphraseTransaction).not.toHaveProperty(
					'id',
				);
			});
		});
	});
});
