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
import { MockStateStore as store } from './helpers';
import { SecondSignatureTransaction } from '../src/9_second_signature_transaction';
import * as protocolSpecSecondSignatureFixture from '../fixtures/transaction_network_id_and_change_order/second_signature_transaction_validate.json';
import * as protocolSpecTransferFixture from '../fixtures/transaction_network_id_and_change_order/transfer_transaction_validate.json';
import { TransactionJSON, Account } from '../src/transaction_types';
import { Status } from '../src/response';
import { hexToBuffer } from '@liskhq/lisk-cryptography';

describe('Second signature registration transaction class', () => {
	const {
		networkIdentifier,
		transaction: validRegisterSecondSignatureTransaction,
	} = protocolSpecSecondSignatureFixture.testCases[0].input;
	const {
		transaction: validTransaction,
	} = protocolSpecTransferFixture.testCases[0].input;

	// let validRegisterSecondSignatureTransaction =
	// 	protocolSpecSecondSignatureFixture.testCases[0].input.transaction;
	// let validTransaction =
	// 	protocolSpecTransferFixture.testCases[0].input.transaction;

	let validTestTransaction: SecondSignatureTransaction;
	let storeAccountCacheStub: jest.SpyInstance;
	let storeAccountGetStub: jest.SpyInstance;
	let storeAccountSetStub: jest.SpyInstance;
	let sender: Partial<Account>;
	beforeEach(async () => {
		validTestTransaction = new SecondSignatureTransaction({
			...validRegisterSecondSignatureTransaction,
			networkIdentifier,
		});
		validTestTransaction.sign(
			protocolSpecSecondSignatureFixture.testCases[0].input.account.passphrase,
		);
		sender = {
			address: '10020978176543317477L',
			balance: BigInt('32981247530771'),
			publicKey:
				'8aceda0f39b35d778f55593227f97152f0b5a78b80b5c4ae88979909095d6204',
			secondPublicKey: null,
			secondSignature: 0,
		};
		storeAccountCacheStub = jest.spyOn(store.account, 'cache');
		storeAccountGetStub = jest
			.spyOn(store.account, 'get')
			.mockReturnValue(sender);
		storeAccountSetStub = jest.spyOn(store.account, 'set');
	});

	describe('#constructor', () => {
		it('should create instance of SecondSignatureTransaction', async () => {
			expect(validTestTransaction).toBeInstanceOf(SecondSignatureTransaction);
		});

		it('should set the second signature asset', async () => {
			expect(validTestTransaction.asset).toHaveProperty('publicKey');
		});

		it('should not throw when asset signature publicKey is not string', async () => {
			const invalidSecondSignatureTransaction = {
				...validRegisterSecondSignatureTransaction,
				asset: {
					signature: { publicKey: 123 },
				},
			};
			expect(
				() => new SecondSignatureTransaction(invalidSecondSignatureTransaction),
			).not.toThrowError();
		});
	});

	describe('#assetToBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).assetToBytes();
			expect(assetBytes).toEqual(
				hexToBuffer(validRegisterSecondSignatureTransaction.asset.publicKey),
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return a successful transaction response', async () => {
			const {
				id,
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				{ ...validRegisterSecondSignatureTransaction, type: 0 },
			] as ReadonlyArray<TransactionJSON>);
			expect(id).toEqual(validTestTransaction.id);
			expect(errors).toEqual([]);
			expect(status).toBe(Status.OK);
		});

		it('should return status true with non related transactions', async () => {
			const {
				id,
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(id).toEqual(validTestTransaction.id);
			expect(Object.keys(errors)).toHaveLength(0);
			expect(status).toBe(Status.OK);
		});

		it('should return TransactionResponse with error when other second signature registration transaction from the same account exists', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validRegisterSecondSignatureTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(Object.keys(errors)).not.toHaveLength(0);
			expect(status).toBe(Status.FAIL);
		});
	});

	describe('#assetToJSON', () => {
		it('should return an object of type transfer asset', async () => {
			expect(validTestTransaction.assetToJSON()).toHaveProperty('publicKey');
		});
	});

	describe('#prepare', () => {
		it('should call state store', async () => {
			await validTestTransaction.prepare(store);
			expect(storeAccountCacheStub).toHaveBeenCalledWith([
				{ address: validTestTransaction.senderId },
			]);
		});
	});

	describe('#validateAsset', () => {
		it('should return no errors', async () => {
			const errors = await (validTestTransaction as any).validateAsset();

			expect(Object.keys(errors)).toHaveLength(0);
		});

		it('should return error when asset includes invalid publicKey', async () => {
			const invalidTransaction = {
				...validRegisterSecondSignatureTransaction,
				asset: {
					publicKey: '1234',
				},
			};
			const transaction = new SecondSignatureTransaction(invalidTransaction);
			const errors = await (transaction as any).validateAsset();

			expect(Object.keys(errors)).toHaveLength(1);
		});
	});

	describe('#applyAsset', () => {
		it('should call state store', async () => {
			await (validTestTransaction as any).applyAsset(store);
			expect(storeAccountGetStub).toHaveBeenCalledWith(
				validTestTransaction.senderId,
			);
			expect(storeAccountSetStub).toHaveBeenCalledWith(
				sender.address,
				expect.objectContaining({
					secondSignature: 1,
					secondPublicKey: validTestTransaction.asset.publicKey,
				}),
			);
		});

		it('should return no errors', async () => {
			const errors = await (validTestTransaction as any).applyAsset(store);
			expect(Object.keys(errors)).toHaveLength(0);
		});

		it('should return error when secondPublicKey exists on account', async () => {
			storeAccountGetStub.mockReturnValue({
				...sender,
				secondPublicKey: '123',
			});
			const errors = await (validTestTransaction as any).applyAsset(store);
			expect(errors[0].message).toContain(
				'Register second signature only allowed once per account.',
			);
		});
	});

	describe('#undoAsset', () => {
		it('should call state store', async () => {
			await (validTestTransaction as any).undoAsset(store);
			expect(storeAccountGetStub).toHaveBeenCalledWith(
				validTestTransaction.senderId,
			);

			expect(storeAccountSetStub).toHaveBeenCalledWith(sender.address, {
				...sender,
				secondSignature: 0,
				secondPublicKey: null,
			});
		});

		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).undoAsset(store);
			expect(Object.keys(errors)).toHaveLength(0);
		});
	});
});
