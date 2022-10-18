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

import {
	ApplicationConfigForPlugin,
	GenesisConfig,
	testing,
	cryptography,
	apiClient,
} from 'lisk-sdk';
import { ChainConnectorPlugin } from '../../src/chain_connector_plugin';
import * as db from '../../src/db';

describe('getSentCCUs', () => {
	const appConfigForPlugin: ApplicationConfigForPlugin = {
		system: {
			keepEventsForHeights: -1,
			dataPath: '~/.lisk',
			logLevel: 'info',
			version: '1.0.0',
		},
		rpc: {
			modes: ['ipc'],
			port: 8080,
			host: '127.0.0.1',
		},
		network: {
			seedPeers: [],
			port: 5000,
			version: '1.0.0',
		},
		transactionPool: {
			maxTransactions: 4096,
			maxTransactionsPerAccount: 64,
			transactionExpiryTime: 3 * 60 * 60 * 1000,
			minEntranceFeePriority: '0',
			minReplacementFeeDifference: '10',
		},
		genesis: {} as GenesisConfig,
		generator: {
			keys: {
				fromFile: '',
			},
		},
		modules: {},
	};

	const validators = [
		{
			address: cryptography.utils.getRandomBytes(20),
			bftWeight: BigInt(2),
			blsKey: cryptography.utils.getRandomBytes(20),
		},
	];
	const validatorsJSON = [
		{
			address: validators[0].address.toString('hex'),
			bftWeight: BigInt(2).toString(),
			blsKey: validators[0].blsKey.toString('hex'),
		},
	];
	const validatorsData = {
		certificateThreshold: BigInt(70),
		validators,
		validatorsHash: cryptography.utils.getRandomBytes(20),
	};
	const validatorsDataJSON = {
		certificateThreshold: validatorsData.certificateThreshold.toString(),
		validators: validatorsJSON,
		validatorsHash: validatorsData.validatorsHash.toString('hex'),
	};
	const aggregateCommit = {
		height: 0,
		aggregationBits: Buffer.alloc(0),
		certificateSignature: Buffer.alloc(0),
	};
	const aggregateCommitJSON = {
		height: 0,
		aggregationBits: Buffer.alloc(0).toString('hex'),
		certificateSignature: Buffer.alloc(0).toString('hex'),
	};
	const chainConnectorInfo = {
		blockHeaders: [testing.createFakeBlockHeader()],
		aggregateCommits: [aggregateCommit],
		validatorsHashPreimage: [validatorsData],
	};
	let chainConnectorPlugin: ChainConnectorPlugin;

	beforeEach(async () => {
		chainConnectorPlugin = new ChainConnectorPlugin();
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({} as never);

		await chainConnectorPlugin.init({
			config: { mainchainIPCPath: '~/.lisk/mainchain' },
			appConfig: appConfigForPlugin,
			logger: testing.mocks.loggerMock,
		});
		jest.spyOn(db, 'getChainConnectorInfo').mockReturnValue(chainConnectorInfo as never);
	});

	describe('getSentCCUs', () => {
		it('should return sent ccus', async () => {
			const response = await chainConnectorPlugin.endpoint.getSentCCUs({} as any);

			expect(response).toStrictEqual([]);
		});
	});

	describe('getAggregateCommits', () => {
		it('should return aggregate commits', async () => {
			const response = await chainConnectorPlugin.endpoint.getAggregateCommits({} as any);

			expect(response).toStrictEqual([aggregateCommitJSON]);
		});
	});

	describe('getValidatorsInfoFromPreimage', () => {
		it('should return list of validators info', async () => {
			const response = await chainConnectorPlugin.endpoint.getValidatorsInfoFromPreimage({} as any);

			expect(response).toStrictEqual([validatorsDataJSON]);
		});
	});
});
