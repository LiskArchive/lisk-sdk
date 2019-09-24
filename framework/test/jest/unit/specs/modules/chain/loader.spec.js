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

const { Loader } = require('../../../../../../src/modules/chain/loader');
const {
	TransactionInterfaceAdapter,
} = require('../../../../../../src/modules/chain/interface_adapters');
const {
	registeredTransactions,
} = require('../../../utils/registered_transactions');

describe('Loader', () => {
	describe('#_getUnconfirmedTransactionsFromNetwork', () => {
		let loader;
		let channelStub;
		let transactionPoolModuleStub;

		beforeEach(async () => {
			const loggerStub = {
				info: jest.fn(),
			};
			const interfaceAdapters = {
				transactions: new TransactionInterfaceAdapter(registeredTransactions),
			};
			transactionPoolModuleStub = {
				processUnconfirmedTransaction: jest.fn(),
			};
			channelStub = {
				invoke: jest.fn(),
			};
			loader = new Loader({
				logger: loggerStub,
				channel: channelStub,
				transactionPoolModule: transactionPoolModuleStub,
				interfaceAdapters,
			});
		});

		describe('when peer returns valid transaction response', () => {
			const validtransactions = {
				transactions: [
					{
						id: '15043091312357212504',
						blockId: undefined,
						height: undefined,
						confirmations: undefined,
						receivedAt: undefined,
						relays: undefined,
						type: 3,
						timestamp: 1724154,
						senderPublicKey:
							'7b371f87a54fd38ec99df0e2c39f6ae8ed90194ac20ec9b11591248850f0c767',
						recipientPublicKey:
							'7b371f87a54fd38ec99df0e2c39f6ae8ed90194ac20ec9b11591248850f0c767',
						senderId: '16220776681445518997L',
						recipientId: '16220776681445518997L',
						amount: '0',
						fee: '100000000',
						signature:
							'2ffb887415fe56ca6ce0a638ec860f01e7da7e4710e60b354190242cd40d3941b3d35733a4fb2da692e655b0402d2ac6dda3c1c6508d874df59a782fa3db2a0d',
						signatures: [],
						signSignature: undefined,
						asset: {
							votes: [
								'+ad287c536f62f19b62aeb44de3a0cef94ba95bc8ff6f75316b6de9e8c59043a9',
							],
						},
					},
				],
			};

			beforeEach(async () => {
				channelStub.invoke.mockReturnValue({ data: validtransactions });
			});

			it('should not throw an error', async () => {
				let error;
				try {
					await loader._getUnconfirmedTransactionsFromNetwork();
				} catch (err) {
					error = err;
				}
				expect(error).toBe(undefined);
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
				channelStub.invoke.mockReturnValue({ data: invalidTransactions });
			});

			it('should throw an error', async () => {
				let error;
				try {
					await loader._getUnconfirmedTransactionsFromNetwork();
				} catch (err) {
					error = err;
				}
				expect(error.length).toBe(1);
				expect(error[0].message).toBe(
					"should have required property 'transactions'",
				);
			});
		});
	});

	describe('#_loadBlocksFromNetwork', () => {
		let loader;
		let channelStub;
		let blocksModuleStub;

		beforeEach(async () => {
			const loggerStub = {
				warn: jest.fn(),
				debug: jest.fn(),
			};
			const interfaceAdapters = {
				transactions: new TransactionInterfaceAdapter(registeredTransactions),
			};
			channelStub = {
				invoke: jest.fn(),
			};
			blocksModuleStub = {
				recoverChain: jest.fn(),
				lastBlock: {
					id: 'blockID',
				},
			};
			const peersModuleStub = {
				isPoorConsensus: jest.fn().mockReturnValue(true),
			};
			loader = new Loader({
				logger: loggerStub,
				channel: channelStub,
				blocksModule: blocksModuleStub,
				peersModule: peersModuleStub,
				interfaceAdapters,
			});
		});

		describe('when blocks endpoint returns success false', () => {
			beforeEach(async () => {
				channelStub.invoke.mockReturnValue({ data: { success: false } });
			});

			it('should call recoverChain of blocks module', async () => {
				await loader._loadBlocksFromNetwork();
				expect(blocksModuleStub.recoverChain).toHaveBeenCalledTimes(5);
			});
		});

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
