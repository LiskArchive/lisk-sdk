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
import { address, utils } from '@liskhq/lisk-cryptography';
import { FeeModule } from '../../../../src/modules/fee';
import { VerifyStatus } from '../../../../src/state_machine';
import { createTransactionContext } from '../../../../src/testing';

describe('FeeModule', () => {
	let feeModule!: FeeModule;
	let genesisConfig: any;
	let moduleConfig: any;
	let generatorConfig: any;

	beforeEach(async () => {
		genesisConfig = {
			minFeePerByte: 1000,
		};
		moduleConfig = {
			feeTokenID: { chainID: utils.intToBuffer(0, 4), localID: utils.intToBuffer(0, 4) },
		};
		generatorConfig = {};
		feeModule = new FeeModule();
		await feeModule.init({ genesisConfig, moduleConfig, generatorConfig });
		feeModule.addDependencies({
			burn: jest.fn(),
			transfer: jest.fn(),
			isNativeToken: jest.fn(),
			getAvailableBalance: jest.fn(),
		} as any);
	});

	describe('init', () => {
		it('should initialize config with default value when module config is empty', async () => {
			feeModule = new FeeModule();
			await expect(
				feeModule.init({ genesisConfig, moduleConfig: {}, generatorConfig: {} }),
			).toResolve();

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
			const result = await feeModule.verifyTransaction({ transaction } as any);
			const expectedMinFee = BigInt(feeModule['_minFeePerByte'] * transaction.getBytes().length);

			expect(result.status).toEqual(VerifyStatus.FAIL);
			expect(result.error).toEqual(
				new Error(`Insufficient transaction fee. Minimum required fee is ${expectedMinFee}.`),
			);
		});
	});

	describe('beforeCommandExecute', () => {
		it('should transfer transaction fee minus min fee to generator and burn min fee when native token', async () => {
			jest.spyOn(feeModule['_tokenMethod'], 'isNativeToken').mockReturnValue(true);

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
			const transactionExecuteContext = context.createTransactionExecuteContext();
			const senderAddress = address.getAddressFromPublicKey(context.transaction.senderPublicKey);
			const minFee = BigInt(feeModule['_minFeePerByte'] * transaction.getBytes().length);
			await feeModule.beforeCommandExecute(transactionExecuteContext);

			expect(feeModule['_tokenMethod'].burn).toHaveBeenCalledWith(
				expect.anything(),
				senderAddress,
				feeModule['_tokenID'],
				minFee,
			);
			expect(feeModule['_tokenMethod'].transfer).toHaveBeenCalledWith(
				expect.anything(),
				senderAddress,
				transactionExecuteContext.header.generatorAddress,
				feeModule['_tokenID'],
				transaction.fee - minFee,
			);
		});

		it('should transfer transaction fee to generator and not burn min fee when non-native token', async () => {
			jest.spyOn(feeModule['_tokenMethod'], 'isNativeToken').mockReturnValue(false);
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
			const transactionExecuteContext = context.createTransactionExecuteContext();
			const senderAddress = address.getAddressFromPublicKey(context.transaction.senderPublicKey);

			await feeModule.beforeCommandExecute(transactionExecuteContext);

			expect(feeModule['_tokenMethod'].burn).not.toHaveBeenCalled();
			expect(feeModule['_tokenMethod'].transfer).toHaveBeenCalledWith(
				expect.anything(),
				senderAddress,
				transactionExecuteContext.header.generatorAddress,
				feeModule['_tokenID'],
				transaction.fee,
			);
		});
	});
});
