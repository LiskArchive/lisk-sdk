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
 *
 */

import { AccountDefaultProps, AccountSchema, Block, BlockHeaderAsset } from '@liskhq/lisk-chain';
import { BaseModule, GenesisConfig } from '..';
import { Logger } from '../logger';
import { BaseModuleChannel } from '../modules';
import { BaseModuleDataAccess } from '../types';
import { moduleChannelMock } from './mocks/channel_mock';
import { DataAccessMock } from './mocks/data_access_mock';
import { loggerMock } from './mocks/logger_mock';
import { APP_EVENT_BLOCK_NEW } from '../constants';
import { Data, ModuleClass, WaitUntilBlockHeightOptions } from './types';

export const getAccountSchemaFromModules = (
	modules: ModuleClass[],
	genesisConfig?: GenesisConfig,
): { [key: string]: AccountSchema } => {
	const accountSchemas: { [key: string]: AccountSchema } = {};

	for (const Klass of modules) {
		const m = new Klass(genesisConfig ?? ({} as never));
		if (m.accountSchema) {
			accountSchemas[m.name] = { ...m.accountSchema, fieldNumber: m.id } as AccountSchema;
		}
	}

	return accountSchemas;
};

export const getModuleInstance = <T1 = AccountDefaultProps, T2 = BlockHeaderAsset>(
	Module: ModuleClass,
	opts?: {
		genesisConfig?: GenesisConfig;
		dataAccess?: BaseModuleDataAccess;
		channel?: BaseModuleChannel;
		logger?: Logger;
	},
): BaseModule => {
	const module = new Module(opts?.genesisConfig ?? ({} as never));

	module.init({
		channel: opts?.channel ?? moduleChannelMock,
		logger: opts?.logger ?? loggerMock,
		dataAccess: opts?.dataAccess ?? (new DataAccessMock<T1, T2>() as never),
	});

	return module;
};

export const waitUntilBlockHeight = async ({
	apiClient,
	height,
	timeout,
}: WaitUntilBlockHeightOptions): Promise<void> =>
	new Promise((resolve, reject) => {
		if (timeout) {
			setTimeout(() => {
				reject(new Error(`'waitUntilBlockHeight' timed out after ${timeout} ms`));
			}, timeout);
		}

		// eslint-disable-next-line @typescript-eslint/require-await
		apiClient.subscribe(APP_EVENT_BLOCK_NEW, async (data?: Data) => {
			const { block } = (data as unknown) as Data;
			const { header } = apiClient.block.decode<Block>(block);

			if (header.height >= height) {
				resolve();
			}
		});
	});
export const defaultConfig = {
	label: 'beta-sdk-app',
	version: '0.0.0',
	networkVersion: '1.0',
	rootPath: '~/.lisk',
	logger: {
		fileLogLevel: 'info',
		consoleLogLevel: 'info',
		logFileName: 'lisk.log',
	},
	rpc: {
		enable: false,
		mode: 'ipc',
		port: 8080,
	},
	genesisConfig: {
		blockTime: 10,
		communityIdentifier: 'sdk',
		// eslint-disable-next-line @typescript-eslint/no-magic-numbers
		maxPayloadLength: 15 * 1024, // Kilo Bytes
		bftThreshold: 68,
		minFeePerByte: 1000,
		baseFees: [
			{
				moduleID: 5,
				assetID: 0,
				baseFee: '1000000000',
			},
		],
		rewards: {
			milestones: [
				'500000000', // Initial Reward
				'400000000', // Milestone 1
				'300000000', // Milestone 2
				'200000000', // Milestone 3
				'100000000', // Milestone 4
			],
			offset: 2160, // Start rewards at 39th block of 22nd round
			distance: 3000000, // Distance between each milestone
		},
		minRemainingBalance: '5000000',
		activeDelegates: 101,
		standbyDelegates: 2,
		delegateListRoundOffset: 2,
	},
	forging: {
		force: false,
		waitThreshold: 2,
		delegates: [], // Copy the delegates info from genesis.json file
	},
	network: {
		seedPeers: [
			{
				ip: '127.0.0.1',
				port: 5000,
			},
		],
		port: 5000,
	},
	transactionPool: {
		maxTransactions: 4096,
		maxTransactionsPerAccount: 64,
		transactionExpiryTime: 3 * 60 * 60 * 1000,
		minEntranceFeePriority: '0',
		minReplacementFeeDifference: '10',
	},
	plugins: {},
};

export const defaultAccountSchema = {
	token: {
		type: 'object',
		fieldNumber: 2,
		properties: {
			balance: {
				fieldNumber: 1,
				dataType: 'uint64',
			},
		},
		default: {
			balance: BigInt(0),
		},
	},
	sequence: {
		type: 'object',
		fieldNumber: 3,
		properties: {
			nonce: {
				fieldNumber: 1,
				dataType: 'uint64',
			},
		},
		default: {
			nonce: BigInt(0),
		},
	},
	keys: {
		type: 'object',
		fieldNumber: 4,
		properties: {
			numberOfSignatures: { dataType: 'uint32', fieldNumber: 1 },
			mandatoryKeys: {
				type: 'array',
				items: { dataType: 'bytes' },
				fieldNumber: 2,
			},
			optionalKeys: {
				type: 'array',
				items: { dataType: 'bytes' },
				fieldNumber: 3,
			},
		},
		default: {
			numberOfSignatures: 0,
			mandatoryKeys: [],
			optionalKeys: [],
		},
	},
	dpos: {
		type: 'object',
		fieldNumber: 5,
		properties: {
			delegate: {
				type: 'object',
				fieldNumber: 1,
				properties: {
					username: { dataType: 'string', fieldNumber: 1 },
					pomHeights: {
						type: 'array',
						items: { dataType: 'uint32' },
						fieldNumber: 2,
					},
					consecutiveMissedBlocks: { dataType: 'uint32', fieldNumber: 3 },
					lastForgedHeight: { dataType: 'uint32', fieldNumber: 4 },
					isBanned: { dataType: 'boolean', fieldNumber: 5 },
					totalVotesReceived: { dataType: 'uint64', fieldNumber: 6 },
				},
				required: [
					'username',
					'pomHeights',
					'consecutiveMissedBlocks',
					'lastForgedHeight',
					'isBanned',
					'totalVotesReceived',
				],
			},
			sentVotes: {
				type: 'array',
				fieldNumber: 2,
				items: {
					type: 'object',
					properties: {
						delegateAddress: {
							dataType: 'bytes',
							fieldNumber: 1,
						},
						amount: {
							dataType: 'uint64',
							fieldNumber: 2,
						},
					},
					required: ['delegateAddress', 'amount'],
				},
			},
			unlocking: {
				type: 'array',
				fieldNumber: 3,
				items: {
					type: 'object',
					properties: {
						delegateAddress: {
							dataType: 'bytes',
							fieldNumber: 1,
						},
						amount: {
							dataType: 'uint64',
							fieldNumber: 2,
						},
						unvoteHeight: {
							dataType: 'uint32',
							fieldNumber: 3,
						},
					},
					required: ['delegateAddress', 'amount', 'unvoteHeight'],
				},
			},
		},
		default: {
			delegate: {
				username: '',
				pomHeights: [],
				consecutiveMissedBlocks: 0,
				lastForgedHeight: 0,
				isBanned: false,
				totalVotesReceived: BigInt(0),
			},
			sentVotes: [],
			unlocking: [],
		},
	},
};
