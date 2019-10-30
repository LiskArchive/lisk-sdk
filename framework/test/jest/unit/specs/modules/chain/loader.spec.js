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
} = require('../../../../utils/registered_transactions');
const {
	devnetNetworkIdentifier: networkIdentifier,
} = require('../../../../utils/network_identifier');

describe('Loader', () => {
	describe('#_getUnconfirmedTransactionsFromNetwork', () => {
		let loader;
		let channelStub;
		let transactionPoolModuleStub;

		beforeEach(async () => {
			const loggerStub = {
				info: jest.fn(),
				error: jest.fn(),
			};
			const interfaceAdapters = {
				transactions: new TransactionInterfaceAdapter(
					networkIdentifier,
					registeredTransactions,
				),
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
							'ddbc1bc638e1fbac3b99bb99901d0347d5abd523a30d413353c949abd4a19295d52ceb20f7ef950d307db98fb89bec8f0ea3a3b740937e4915647754f14ec601',
						id: '17637915433304629522',
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
				transactions: new TransactionInterfaceAdapter(
					networkIdentifier,
					registeredTransactions,
				),
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
