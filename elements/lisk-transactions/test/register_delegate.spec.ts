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
import { registerDelegate } from '../src/register_delegate';
import { DelegateAsset } from '../src/10_delegate_transaction';
import { TransactionJSON } from '../src/transaction_types';
import * as time from '../src/utils/time';

describe('#registerDelegate transaction', () => {
	const fixedPoint = 10 ** 8;
	const passphrase = 'secret';
	const transactionType = 10;
	const publicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const username = 'test_delegate_1@\\';
	const fee = (25 * fixedPoint).toString();
	const timeWithOffset = 38350076;
	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	let getTimeWithOffsetStub: jest.SpyInstance;
	let registerDelegateTransaction: Partial<TransactionJSON>;

	beforeEach(() => {
		getTimeWithOffsetStub = jest
			.spyOn(time, 'getTimeWithOffset')
			.mockReturnValue(timeWithOffset);
		return Promise.resolve();
	});

	describe('with first passphrase', () => {
		beforeEach(() => {
			registerDelegateTransaction = registerDelegate({
				passphrase,
				username,
				networkIdentifier,
			});
			return Promise.resolve();
		});

		it('should create a register delegate transaction', () => {
			return expect(registerDelegateTransaction).toBeTruthy();
		});

		it('should use time.getTimeWithOffset to calculate the timestamp', () => {
			return expect(getTimeWithOffsetStub).toHaveBeenCalledWith(undefined);
		});

		it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			registerDelegate({
				networkIdentifier,
				passphrase,
				username,
				timeOffset: offset,
			});

			return expect(getTimeWithOffsetStub).toHaveBeenCalledWith(offset);
		});

		it('should be an object', () => {
			return expect(registerDelegateTransaction).toBeObject();
		});

		it('should have an id string', () => {
			return expect(registerDelegateTransaction.id).toBeString();
		});

		it('should have type number equal to 2', () => {
			return expect(registerDelegateTransaction).toHaveProperty(
				'type',
				transactionType,
			);
		});

		it('should have fee string equal to 25 LSK', () => {
			return expect(registerDelegateTransaction).toHaveProperty('fee', fee);
		});

		it('should have senderPublicKey hex string equal to sender public key', () => {
			return expect(registerDelegateTransaction).toHaveProperty(
				'senderPublicKey',
				publicKey,
			);
		});

		it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
			return expect(registerDelegateTransaction).toHaveProperty(
				'timestamp',
				timeWithOffset,
			);
		});

		it('should have signature hex string', () => {
			return expect(registerDelegateTransaction.signature).toBeString();
		});

		it('second signature property should be undefined', () => {
			return expect(registerDelegateTransaction.signSignature).toEqual(
				undefined,
			);
		});

		it('should have asset', () => {
			return expect(Object.keys(registerDelegateTransaction)).not.toHaveLength(
				0,
			);
		});

		describe('delegate asset', () => {
			it('should be an object', () => {
				return expect(
					(registerDelegateTransaction.asset as any).username,
				).toBeString();
			});

			it('should have the provided username as a string', () => {
				const { username } = registerDelegateTransaction.asset as DelegateAsset;
				return expect(username).toBe(username);
			});
		});
	});

	describe('with first passphrase', () => {
		beforeEach(() => {
			registerDelegateTransaction = registerDelegate({
				networkIdentifier,
				passphrase,
				username,
			});
			return Promise.resolve();
		});
	});

	describe('unsigned register delegate transaction', () => {
		describe('when the register delegate transaction is created without a passphrase', () => {
			beforeEach(() => {
				registerDelegateTransaction = registerDelegate({
					networkIdentifier,
					username,
				});
				return Promise.resolve();
			});

			it('should throw error when username was not provided', () => {
				return expect(registerDelegate.bind(null, {} as any)).toThrowError(
					'Please provide a username. Expected string.',
				);
			});

			it('should throw error when username is empty string', () => {
				return expect(
					registerDelegate.bind(null, { networkIdentifier, username: '' }),
				).toThrowError('Please provide a username. Expected string.');
			});

			it('should throw error when invalid username was provided', () => {
				return expect(
					registerDelegate.bind(null, {
						networkIdentifier,
						username: '12345678901234567890a',
					}),
				).toThrowError(
					'Username length does not match requirements. Expected to be no more than 20 characters.',
				);
			});

			it('should have the type', () => {
				return expect(registerDelegateTransaction).toHaveProperty(
					'type',
					transactionType,
				);
			});

			it('should have the fee', () => {
				return expect(registerDelegateTransaction).toHaveProperty('fee', fee);
			});

			it('should have the sender public key', () => {
				return expect(registerDelegateTransaction).toHaveProperty(
					'senderPublicKey',
					undefined,
				);
			});

			it('should have the timestamp', () => {
				return expect(registerDelegateTransaction).toHaveProperty('timestamp');
			});

			it('should have the asset with the delegate', () => {
				return expect(registerDelegateTransaction.asset).toHaveProperty(
					'username',
				);
			});

			it('should not have the signature', () => {
				return expect(registerDelegateTransaction).not.toHaveProperty(
					'signature',
				);
			});

			it('should not have the id', () => {
				return expect(registerDelegateTransaction).not.toHaveProperty('id');
			});
		});
	});
});
