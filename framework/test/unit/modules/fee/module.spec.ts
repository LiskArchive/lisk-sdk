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
import { when } from 'jest-when';
import { FeeModule } from '../../../../src/modules/fee';
import { CONTEXT_STORE_KEY_AVAILABLE_FEE } from '../../../../src/modules/fee/constants';
import { MODULE_NAME_TOKEN } from '../../../../src/modules/interoperability/cc_methods';
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
	let tokenMethod: any;

	beforeEach(async () => {
		genesisConfig = {
			chainID: Buffer.alloc(4).toString('hex'),
		};
		moduleConfig = {};
		feeModule = new FeeModule();
		await feeModule.init({ genesisConfig, moduleConfig });
		tokenMethod = {
			burn: jest.fn(),
			lock: jest.fn(),
			unlock: jest.fn(),
			transfer: jest.fn(),
			getAvailableBalance: jest.fn(),
			userAccountExists: jest.fn(),
		} as any;
		feeModule.addDependencies(tokenMethod, {} as any);
		jest.spyOn(tokenMethod, 'getAvailableBalance').mockResolvedValue(BigInt(2000000000));
		jest.spyOn(tokenMethod, 'userAccountExists');
	});

	describe('init', () => {
		it('should initialize config with default value when module config is empty', async () => {
			feeModule = new FeeModule();
			await expect(feeModule.init({ genesisConfig, moduleConfig: {} })).toResolve();

			expect(feeModule['_tokenID']).toEqual(Buffer.alloc(8, 0));
		});

		it('should set the minFeePerByte property', () => {
			expect(feeModule['_minFeePerByte']).toBe(1000);
		});

		it('should set the maxBlockHeightZeroFeePerByte property', () => {
			expect(feeModule['_maxBlockHeightZeroFeePerByte']).toBe(0);
		});

		it('should call method and endpoint init', async () => {
			feeModule = new FeeModule();
			// Spy on init functions
			jest.spyOn(feeModule.endpoint, 'init');
			jest.spyOn(feeModule.method, 'init');
			await feeModule.init({ genesisConfig, moduleConfig });

			expect(feeModule.endpoint.init).toHaveBeenCalled();
			expect(feeModule.method.init).toHaveBeenCalled();
		});
	});

	describe('verifyTransaction', () => {
		const transaction = new Transaction({
			module: MODULE_NAME_TOKEN,
			command: 'transfer',
			fee: BigInt(1000000000),
			nonce: BigInt(0),
			senderPublicKey: utils.getRandomBytes(32),
			signatures: [utils.getRandomBytes(20)],
			params: utils.getRandomBytes(32),
		});

		it('should validate transaction with sufficient min fee', async () => {
			const context = createTransactionContext({ transaction });
			const transactionVerifyContext = context.createTransactionVerifyContext();
			const result = await feeModule.verifyTransaction(transactionVerifyContext);

			expect(result.status).toEqual(VerifyStatus.OK);
		});

		it('should validate transaction with exactly the min fee', async () => {
			const exactMinFee = BigInt(113000);
			const tx = new Transaction({ ...transaction, fee: exactMinFee });

			const context = createTransactionContext({ transaction: tx });
			const transactionVerifyContext = context.createTransactionVerifyContext();
			const result = await feeModule.verifyTransaction(transactionVerifyContext);

			expect(result.status).toEqual(VerifyStatus.OK);
		});

		it('should invalidate transaction with insufficient min fee', async () => {
			const tx = new Transaction({ ...transaction, fee: BigInt(0) });
			const context = createTransactionContext({ transaction: tx });
			const transactionVerifyContext = context.createTransactionVerifyContext();
			const expectedMinFee = BigInt(feeModule['_minFeePerByte'] * tx.getBytes().length);
			await expect(feeModule.verifyTransaction(transactionVerifyContext)).rejects.toThrow(
				`Insufficient transaction fee. Minimum required fee is ${expectedMinFee}.`,
			);
		});

		it('should validate transaction with balance greater than min fee', async () => {
			const tx = new Transaction({ ...transaction, fee: BigInt(1000000000) });
			const context = createTransactionContext({ transaction: tx });
			const transactionVerifyContext = context.createTransactionVerifyContext();
			const result = await feeModule.verifyTransaction(transactionVerifyContext);
			expect(result.status).toEqual(VerifyStatus.OK);
		});

		it('should invalidate transaction with balance less than min fee', async () => {
			const tx = new Transaction({ ...transaction, fee: BigInt(100000000000000000) });
			const context = createTransactionContext({ transaction: tx });
			const transactionVerifyContext = context.createTransactionVerifyContext();
			await expect(feeModule.verifyTransaction(transactionVerifyContext)).rejects.toThrow(
				`Insufficient balance.`,
			);
		});

		it('should invalidate transaction if the sender account is not initialized for the token id', async () => {
			when(tokenMethod.getAvailableBalance)
				.calledWith(expect.anything(), transaction.senderAddress, feeModule['_tokenID'])
				.mockRejectedValue(new Error('Account does not exist.') as never);
			const context = createTransactionContext({ transaction });
			const transactionVerifyContext = context.createTransactionVerifyContext();
			await expect(feeModule.verifyTransaction(transactionVerifyContext)).rejects.toThrow(
				'Account does not exist.',
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

		it('should set default transaction fee to context store if block height is less than maxBlockHeightZeroFeePerByte', async () => {
			feeModule = new FeeModule();
			await feeModule.init({ genesisConfig, moduleConfig: { maxBlockHeightZeroFeePerByte: 76 } });
			feeModule.addDependencies(tokenMethod, {} as any);
			const context = createTransactionContext({ transaction: defaultTransaction });
			const transactionExecuteContext = context.createTransactionExecuteContext();

			await feeModule.beforeCommandExecute(transactionExecuteContext);

			expect(transactionExecuteContext.contextStore.get(CONTEXT_STORE_KEY_AVAILABLE_FEE)).toEqual(
				defaultTransaction.fee,
			);
		});
	});

	describe('afterCommandExecute', () => {
		let context: TransactionExecuteContext;
		const availableFee = defaultTransaction.fee - BigInt(10000);

		beforeEach(() => {
			context = createTransactionContext({
				transaction: defaultTransaction,
			}).createCommandExecuteContext();
			context.contextStore.set(CONTEXT_STORE_KEY_AVAILABLE_FEE, availableFee);
		});

		it('should unlock transaction fee from sender', async () => {
			await feeModule.afterCommandExecute(context);

			expect(feeModule['_tokenMethod'].unlock).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				feeModule.name,
				feeModule['_tokenID'],
				defaultTransaction.fee,
			);
		});

		it('should burn the used fee when addressFeePool is not defined', async () => {
			when(tokenMethod.userAccountExists)
				.calledWith(expect.anything(), context.header.generatorAddress, feeModule['_tokenID'])
				.mockResolvedValue(true as never);
			await feeModule.afterCommandExecute(context);

			expect(feeModule['_tokenMethod'].burn).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				feeModule['_tokenID'],
				defaultTransaction.fee - availableFee,
			);
		});

		it('should transfer the entire fee when addressFeePool is defined and user account for token id exists for fee pool address but does not exist for generator address', async () => {
			feeModule['_feePoolAddress'] = utils.getRandomBytes(20);
			when(tokenMethod.userAccountExists)
				.calledWith(expect.anything(), context.header.generatorAddress, feeModule['_tokenID'])
				.mockResolvedValue(false as never);
			when(tokenMethod.userAccountExists)
				.calledWith(expect.anything(), feeModule['_feePoolAddress'], feeModule['_tokenID'])
				.mockResolvedValue(true as never);

			await feeModule.afterCommandExecute(context);

			expect(feeModule['_tokenMethod'].transfer).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				feeModule['_feePoolAddress'],
				feeModule['_tokenID'],
				defaultTransaction.fee,
			);
			expect(feeModule['_tokenMethod'].burn).not.toHaveBeenCalled();
		});

		it('should transfer the used fee when addressFeePool is defined and user accounts of fee pool address and generator address exists for the token id', async () => {
			feeModule['_feePoolAddress'] = utils.getRandomBytes(20);
			when(tokenMethod.userAccountExists)
				.calledWith(expect.anything(), context.header.generatorAddress, feeModule['_tokenID'])
				.mockResolvedValue(true as never);
			when(tokenMethod.userAccountExists)
				.calledWith(expect.anything(), feeModule['_feePoolAddress'], feeModule['_tokenID'])
				.mockResolvedValue(true as never);

			await feeModule.afterCommandExecute(context);

			expect(feeModule['_tokenMethod'].transfer).toHaveBeenCalledTimes(2);
			expect(feeModule['_tokenMethod'].transfer).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				feeModule['_feePoolAddress'],
				feeModule['_tokenID'],
				defaultTransaction.fee - availableFee,
			);
			expect(feeModule['_tokenMethod'].transfer).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				context.header.generatorAddress,
				feeModule['_tokenID'],
				availableFee,
			);
			expect(feeModule['_tokenMethod'].burn).not.toHaveBeenCalled();
		});

		it('should burn the used fee when addressFeePool is defined and user account for token id exists for generator address but does not exist for fee pool address', async () => {
			feeModule['_feePoolAddress'] = utils.getRandomBytes(20);
			when(tokenMethod.userAccountExists)
				.calledWith(expect.anything(), context.header.generatorAddress, feeModule['_tokenID'])
				.mockResolvedValue(true as never);
			when(tokenMethod.userAccountExists)
				.calledWith(expect.anything(), feeModule['_feePoolAddress'], feeModule['_tokenID'])
				.mockResolvedValue(false as never);

			await feeModule.afterCommandExecute(context);

			expect(feeModule['_tokenMethod'].burn).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				feeModule['_tokenID'],
				defaultTransaction.fee - availableFee,
			);
			expect(feeModule['_tokenMethod'].transfer).toHaveBeenCalledTimes(1);
			expect(feeModule['_tokenMethod'].transfer).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				context.header.generatorAddress,
				feeModule['_tokenID'],
				availableFee,
			);
		});

		it('should burn the entire fee when addressFeePool is defined but user accounts of fee pool address and generator address does not exist for the token id', async () => {
			when(tokenMethod.userAccountExists)
				.calledWith(expect.anything(), context.header.generatorAddress, feeModule['_tokenID'])
				.mockResolvedValue(false as never);
			when(tokenMethod.userAccountExists)
				.calledWith(expect.anything(), feeModule['_feePoolAddress'], feeModule['_tokenID'])
				.mockResolvedValue(false as never);
			feeModule['_feePoolAddress'] = utils.getRandomBytes(20);

			await feeModule.afterCommandExecute(context);

			expect(feeModule['_tokenMethod'].burn).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				feeModule['_tokenID'],
				defaultTransaction.fee,
			);
			expect(feeModule['_tokenMethod'].transfer).not.toHaveBeenCalled();
		});

		it('should transfer remaining fee to block generator if user account of generator address exists for the token id', async () => {
			when(tokenMethod.userAccountExists)
				.calledWith(expect.anything(), context.header.generatorAddress, feeModule['_tokenID'])
				.mockResolvedValue(true as never);
			await feeModule.afterCommandExecute(context);

			expect(feeModule['_tokenMethod'].transfer).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				context.header.generatorAddress,
				feeModule['_tokenID'],
				availableFee,
			);
		});

		it('should not transfer remaining fee to block generator if user account of generator address does not exist for the token id', async () => {
			when(tokenMethod.userAccountExists)
				.calledWith(expect.anything(), context.header.generatorAddress, feeModule['_tokenID'])
				.mockResolvedValue(false as never);
			await feeModule.afterCommandExecute(context);

			expect(feeModule['_tokenMethod'].transfer).not.toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				context.header.generatorAddress,
				feeModule['_tokenID'],
				expect.anything(),
			);
		});

		it('should reset the context store', async () => {
			await feeModule.afterCommandExecute(context);

			expect(context.contextStore.get(CONTEXT_STORE_KEY_AVAILABLE_FEE)).toBeUndefined();
		});
	});
});
