/*
 * Copyright © 2021 Lisk Foundation
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

import { Transaction } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import { FeeModule } from '../../../../src/modules/fee';
import { CONTEXT_STORE_KEY_AVAILABLE_FEE } from '../../../../src/modules/fee/constants';
import { TransactionExecuteContext, VerifyStatus } from '../../../../src/state_machine';
import { createTransactionContext } from '../../../../src/testing';

describe('FeeModule', () => {
	const defaultTransaction = new Transaction({
		module: 'token',
		command: 'transfer',
		fee: BigInt(1000000000),
		nonce: BigInt(0),
		senderPublicKey: utils.getRandomBytes(32),
		signatures: [utils.getRandomBytes(20)],
		params: utils.getRandomBytes(32),
	});

	let feeModule!: FeeModule;
	let genesisConfig: any;
	let moduleConfig: any;

	beforeEach(async () => {
		genesisConfig = {
			chainID: Buffer.alloc(4).toString('hex'),
		};
		moduleConfig = {};
		feeModule = new FeeModule();
		await feeModule.init({ genesisConfig, moduleConfig });
		feeModule.addDependencies({
			burn: jest.fn(),
			lock: jest.fn(),
			unlock: jest.fn(),
			transfer: jest.fn(),
			getAvailableBalance: jest.fn(),
		} as any);
	});

	describe('init', () => {
		it('should initialize config with default value when module config is empty', async () => {
			feeModule = new FeeModule();
			await expect(feeModule.init({ genesisConfig, moduleConfig: {} })).toResolve();

			expect(feeModule['_tokenID']).toEqual(Buffer.alloc(8, 0));
		});

		it('should set the minFeePerByte property', () => {
			expect(feeModule['_minFeePerByte']).toEqual(1000);
		});
	});

	describe('verifyTransaction', () => {
		it('should validate transaction with sufficient min fee', async () => {
			const transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				fee: BigInt(1000000000),
				nonce: BigInt(0),
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [utils.getRandomBytes(20)],
				params: utils.getRandomBytes(32),
			});
			const context = createTransactionContext({ transaction });
			const transactionVerifyContext = context.createTransactionVerifyContext();
			const result = await feeModule.verifyTransaction(transactionVerifyContext);

			expect(result.status).toEqual(VerifyStatus.OK);
		});

		it('should validate transaction with exactly the min fee', async () => {
			const exactMinFee = BigInt(113000);
			const transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				fee: exactMinFee,
				nonce: BigInt(0),
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [utils.getRandomBytes(20)],
				params: utils.getRandomBytes(32),
			});
			const context = createTransactionContext({ transaction });
			const transactionVerifyContext = context.createTransactionVerifyContext();
			const result = await feeModule.verifyTransaction(transactionVerifyContext);

			expect(result.status).toEqual(VerifyStatus.OK);
		});

		it('should invalidate transaction with insufficient min fee', async () => {
			const transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				fee: BigInt(0),
				nonce: BigInt(0),
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [utils.getRandomBytes(20)],
				params: utils.getRandomBytes(32),
			});
			const expectedMinFee = BigInt(feeModule['_minFeePerByte'] * transaction.getBytes().length);
			await expect(feeModule.verifyTransaction({ transaction } as any)).rejects.toThrow(
				`Insufficient transaction fee. Minimum required fee is ${expectedMinFee}.`,
			);
		});
	});

	describe('beforeCommandExecute', () => {
		it('should lock transaction fee from sender', async () => {
			const context = createTransactionContext({ transaction: defaultTransaction });
			const transactionExecuteContext = context.createTransactionExecuteContext();
			await feeModule.beforeCommandExecute(transactionExecuteContext);

			expect(feeModule['_tokenMethod'].lock).toHaveBeenCalledWith(
				expect.anything(),
				transactionExecuteContext.transaction.senderAddress,
				feeModule.name,
				feeModule['_tokenID'],
				defaultTransaction.fee,
			);
		});

		it('should set avilable fee to context store', async () => {
			const context = createTransactionContext({ transaction: defaultTransaction });
			const transactionExecuteContext = context.createTransactionExecuteContext();

			await feeModule.beforeCommandExecute(transactionExecuteContext);

			const minFee = BigInt(feeModule['_minFeePerByte'] * defaultTransaction.getBytes().length);

			expect(transactionExecuteContext.contextStore.get(CONTEXT_STORE_KEY_AVAILABLE_FEE)).toEqual(
				defaultTransaction.fee - minFee,
			);
		});
	});

	describe('afterCommandExecute', () => {
		let context: TransactionExecuteContext;
		const availableFee = defaultTransaction.fee - BigInt(10000);

		beforeEach(async () => {
			context = createTransactionContext({
				transaction: defaultTransaction,
			}).createCommandExecuteContext();
			context.contextStore.set(CONTEXT_STORE_KEY_AVAILABLE_FEE, availableFee);
			await feeModule.afterCommandExecute(context);
		});

		it('should unlock transaction fee from sender', () => {
			expect(feeModule['_tokenMethod'].unlock).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				feeModule.name,
				feeModule['_tokenID'],
				defaultTransaction.fee,
			);
		});

		it('should burn the used fee', () => {
			expect(feeModule['_tokenMethod'].burn).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				feeModule['_tokenID'],
				defaultTransaction.fee - availableFee,
			);
		});

		it('should transfer remaining fee to block generator', () => {
			expect(feeModule['_tokenMethod'].transfer).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				context.header.generatorAddress,
				feeModule['_tokenID'],
				availableFee,
			);
		});

		it('should reset the context store', () => {
			expect(context.contextStore.get(CONTEXT_STORE_KEY_AVAILABLE_FEE)).toBeUndefined();
		});
	});
});
