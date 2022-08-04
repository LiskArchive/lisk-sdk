/*
 * Copyright © 2022 Lisk Foundation
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

import { ApplicationConfigForPlugin, GenesisConfig, testing, cryptography } from 'lisk-sdk';
import { ChainConnectorPlugin } from '../../src/chain_connector_plugin';
import * as db from '../../src/db';

describe('getSentCCUs', () => {
	const appConfigForPlugin: ApplicationConfigForPlugin = {
		rootPath: '~/.lisk',
		label: 'my-app',
		logger: {
			consoleLogLevel: 'info',
			fileLogLevel: 'none',
			logFileName: 'plugin-ChainConnector.log',
		},
		system: {
			keepEventsForHeights: -1,
		},
		rpc: {
			modes: [],
			port: 8080,
			host: '127.0.0.1',
		},
		generation: {
			force: false,
			waitThreshold: 2,
			generators: [],
			modules: {},
		},
		network: {
			seedPeers: [],
			port: 5000,
		},
		transactionPool: {
			maxTransactions: 4096,
			maxTransactionsPerAccount: 64,
			transactionExpiryTime: 3 * 60 * 60 * 1000,
			minEntranceFeePriority: '0',
			minReplacementFeeDifference: '10',
		},
		version: '',
		networkVersion: '',
		genesis: {} as GenesisConfig,
	};

	const validators = [
		{
			address: cryptography.getRandomBytes(20),
			bftWeight: BigInt(2),
			blsKey: cryptography.getRandomBytes(20),
		},
	];
	const validatorsData = {
		certificateThreshold: BigInt(70),
		validators,
		validatorsHash: cryptography.getRandomBytes(20),
	};
	const aggregateCommit = {
		height: 0,
		aggregationBits: Buffer.alloc(0),
		certificateSignature: Buffer.alloc(0),
	};
	const chainConnectorInfo = {
		blockHeaders: [testing.createFakeBlockHeader()],
		aggregateCommits: [aggregateCommit],
		validatorsHashPreimage: [validatorsData],
	};
	let chainConnectorPlugin: ChainConnectorPlugin;

	beforeEach(async () => {
		chainConnectorPlugin = new ChainConnectorPlugin();
		await chainConnectorPlugin.init({
			config: { mainchainIPCPath: '~/.lisk/mainchain' },
			appConfig: appConfigForPlugin,
			logger: testing.mocks.loggerMock,
		});

		jest.spyOn(db, 'getChainConnectorInfo').mockReturnValue(chainConnectorInfo as never);
	});

	describe('getSentCCUs', () => {
		it('should return sent ccus', () => {
			const response = chainConnectorPlugin.endpoint.getSentCCUs({} as any);

			expect(response).toStrictEqual([]);
		});
	});

	describe('getAggregateCommits', () => {
		it('should return aggregate commits', async () => {
			const response = await chainConnectorPlugin.endpoint.getAggregateCommits({} as any);

			expect(response).toStrictEqual([aggregateCommit]);
		});
	});

	describe('getValidatorsInfoFromPreimage', () => {
		it('should return list of validators info', async () => {
			const response = await chainConnectorPlugin.endpoint.getValidatorsInfoFromPreimage({} as any);

			expect(response).toStrictEqual([validatorsData]);
		});
	});
});
