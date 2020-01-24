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
 */

'use strict';

const { Loader } = require('../../../../../../src/controller/node/loader');

describe('Loader', () => {
	let loader;
	let channelStub;
	let blocksModuleStub;
	let transactionPoolModuleStub;

	beforeEach(async () => {
		const loggerStub = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
		};
		blocksModuleStub = {
			recoverChain: jest.fn(),
			lastBlock: {
				id: 'blockID',
			},
			deserializeTransaction: jest.fn().mockImplementation(val => val),
			validateTransactions: jest.fn().mockResolvedValue({
				transactionsResponses: [
					{
						errors: [],
						status: 1,
					},
				],
			}),
		};
		transactionPoolModuleStub = {
			processUnconfirmedTransaction: jest.fn(),
		};
		channelStub = {
			invoke: jest.fn(),
			invokeFromNetwork: jest.fn(),
		};
		loader = new Loader({
			logger: loggerStub,
			channel: channelStub,
			transactionPoolModule: transactionPoolModuleStub,
			blocksModule: blocksModuleStub,
		});
	});

	describe('#_getUnconfirmedTransactionsFromNetwork', () => {
		describe('when peer returns valid transaction response', () => {
			const validtransactions = {
				transactions: [
					{
						type: 11,
						senderPublicKey:
							'efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
						timestamp: 54316326,
						asset: {
							votes: [
								'+0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
								'+6766ce280eb99e45d2cc7d9c8c852720940dab5d69f480e80477a97b4255d5d8',
								'-1387d8ec6306807ffd6fe27ea3443985765c1157928bb09904307956f46a9972',
							],
						},
						signature:
							'b534786e208c570022ac7ebdb19915d8772998bab2fa7bdfb5fe219c2103a0517209301974c772596c46dd95b2d32b3b1f38172295801ff8c3968654a7bde406',
						id: '16951860278597630982',
					},
				],
			};

			beforeEach(async () => {
				channelStub.invokeFromNetwork.mockReturnValue({
					data: validtransactions,
				});
			});

			it('should not throw an error', async () => {
				let error;
				try {
					await loader._getUnconfirmedTransactionsFromNetwork();
				} catch (err) {
					error = err;
				}
				expect(error).toBeUndefined();
			});

			it('should process the transaction with transactionPoolModule', async () => {
				await loader._getUnconfirmedTransactionsFromNetwork();
				expect(
					transactionPoolModuleStub.processUnconfirmedTransaction,
				).toHaveBeenCalledTimes(1);
			});
		});

		describe('when peer returns invalid transaction response', () => {
			const invalidTransactions = { signatures: [] };
			beforeEach(async () => {
				channelStub.invokeFromNetwork.mockReturnValue({
					data: invalidTransactions,
				});
			});

			it('should throw an error', async () => {
				let error;
				try {
					await loader._getUnconfirmedTransactionsFromNetwork();
				} catch (err) {
					error = err;
				}
				expect(error).toHaveLength(1);
				expect(error[0].message).toBe(
					"should have required property 'transactions'",
				);
			});
		});
	});

	describe('#_loadBlocksFromNetwork', () => {
		describe('when blocks endpoint returns success true and empty array', () => {
			beforeEach(async () => {
				channelStub.invoke.mockReturnValue({
					data: { success: [], blocks: [] },
				});
			});

			it('should not call recoverChain of blocks module', async () => {
				await loader._loadBlocksFromNetwork();
				expect(blocksModuleStub.recoverChain).not.toHaveBeenCalled();
			});
		});
	});
});
