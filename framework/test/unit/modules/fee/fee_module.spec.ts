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
import { getAddressFromPublicKey, getRandomBytes } from '@liskhq/lisk-cryptography';
import { FeeModule } from '../../../../src/modules/fee';
import { VerifyStatus } from '../../../../src/node/state_machine';
import { createTransactionContext } from '../../../../src/testing';

describe('FeeModule', () => {
	let feeModule!: FeeModule;
	let genesisConfig: any;
	let moduleConfig: any;
	let generatorConfig: any;

	beforeEach(async () => {
		genesisConfig = {
			baseFees: [
				{
					commandID: 0,
					baseFee: '1',
					moduleID: 5,
				},
			],
			minFeePerByte: 1000,
		};
		moduleConfig = { feeTokenID: { chainID: 0, localID: 0 } };
		generatorConfig = {};
		feeModule = new FeeModule();
		await feeModule.init({ genesisConfig, moduleConfig, generatorConfig });
		feeModule.addDependencies({ burn: jest.fn(), transfer: jest.fn() } as any);
	});

	describe('init', () => {
		it('should set the moduleConfig property', () => {
			expect(feeModule['_moduleConfig']).toEqual(moduleConfig);
		});

		it('should set the minFeePerByte property', () => {
			expect(feeModule['_minFeePerByte']).toEqual(1000);
		});

		it('should set the baseFees property', () => {
			expect(feeModule['_baseFees']).toEqual(
				genesisConfig.baseFees.map((fee: any) => ({ ...fee, baseFee: BigInt(fee.baseFee) })),
			);
		});
	});

	describe('verifyTransaction', () => {
		it('should validate transaction with sufficient min fee', async () => {
			const transaction = new Transaction({
				moduleID: 5,
				commandID: 0,
				fee: BigInt(1000000000),
				nonce: BigInt(0),
				senderPublicKey: getRandomBytes(32),
				signatures: [getRandomBytes(20)],
				params: getRandomBytes(32),
			});
			const context = createTransactionContext({ transaction });
			const transactionVerifyContext = context.createTransactionVerifyContext();
			const result = await feeModule.verifyTransaction(transactionVerifyContext);

			expect(result.status).toEqual(VerifyStatus.OK);
		});

		it('should validate transaction with exactly the min fee', async () => {
			const exactMinFee = BigInt(102001);
			const transaction = new Transaction({
				moduleID: 5,
				commandID: 0,
				fee: exactMinFee,
				nonce: BigInt(0),
				senderPublicKey: getRandomBytes(32),
				signatures: [getRandomBytes(20)],
				params: getRandomBytes(32),
			});
			const context = createTransactionContext({ transaction });
			const transactionVerifyContext = context.createTransactionVerifyContext();
			const result = await feeModule.verifyTransaction(transactionVerifyContext);

			expect(result.status).toEqual(VerifyStatus.OK);
		});

		it('should invalidate transaction with insufficient min fee', async () => {
			const transaction = new Transaction({
				moduleID: 5,
				commandID: 0,
				fee: BigInt(0),
				nonce: BigInt(0),
				senderPublicKey: getRandomBytes(32),
				signatures: [getRandomBytes(20)],
				params: getRandomBytes(32),
			});
			const result = await feeModule.verifyTransaction({ transaction } as any);
			const expectedMinFee =
				BigInt(feeModule['_minFeePerByte'] * transaction.getBytes().length) +
				BigInt(feeModule['_extraFee'](transaction.moduleID, transaction.commandID));

			expect(result.status).toEqual(VerifyStatus.FAIL);
			expect(result.error).toEqual(
				new Error(`Insufficient transaction fee. Minimum required fee is ${expectedMinFee}.`),
			);
		});
	});

	describe('beforeCommandExecute', () => {
		it('should transfer transaction fee minus min fee to generator and burn min fee when native token', async () => {
			const transaction = new Transaction({
				moduleID: 5,
				commandID: 0,
				fee: BigInt(1000000000),
				nonce: BigInt(0),
				senderPublicKey: getRandomBytes(32),
				signatures: [getRandomBytes(20)],
				params: getRandomBytes(32),
			});
			const context = createTransactionContext({ transaction });
			const transactionExecuteContext = context.createTransactionExecuteContext();
			const apiContext = transactionExecuteContext.getAPIContext();
			const senderAddress = getAddressFromPublicKey(context.transaction.senderPublicKey);
			const minFee =
				BigInt(feeModule['_minFeePerByte'] * transaction.getBytes().length) +
				feeModule['_extraFee'](transaction.moduleID, transaction.commandID);
			await feeModule.beforeCommandExecute(transactionExecuteContext);

			expect(feeModule['_tokenAPI'].burn).toHaveBeenCalledWith(
				apiContext,
				senderAddress,
				feeModule['_moduleConfig'].feeTokenID,
				minFee,
			);
			expect(feeModule['_tokenAPI'].transfer).toHaveBeenCalledWith(
				apiContext,
				senderAddress,
				transactionExecuteContext.header.generatorAddress,
				feeModule['_moduleConfig'].feeTokenID,
				transaction.fee - minFee,
			);
		});

		it('should transfer transaction fee to generator and not burn min fee when non-native token', async () => {
			feeModule['_moduleConfig'].feeTokenID = { chainID: 2, localID: 0 };
			const transaction = new Transaction({
				moduleID: 5,
				commandID: 0,
				fee: BigInt(1000000000),
				nonce: BigInt(0),
				senderPublicKey: getRandomBytes(32),
				signatures: [getRandomBytes(20)],
				params: getRandomBytes(32),
			});
			const context = createTransactionContext({ transaction });
			const transactionExecuteContext = context.createTransactionExecuteContext();
			const apiContext = transactionExecuteContext.getAPIContext();
			const senderAddress = getAddressFromPublicKey(context.transaction.senderPublicKey);

			await feeModule.beforeCommandExecute(transactionExecuteContext);

			expect(feeModule['_tokenAPI'].burn).not.toHaveBeenCalled();
			expect(feeModule['_tokenAPI'].transfer).toHaveBeenCalledWith(
				apiContext,
				senderAddress,
				transactionExecuteContext.header.generatorAddress,
				feeModule['_moduleConfig'].feeTokenID,
				transaction.fee,
			);
		});
	});
});
