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

import * as fs from 'fs-extra';
import { AccountDefaultProps, AccountSchema, Block, BlockHeaderAsset } from '@liskhq/lisk-chain';
import { Database } from '@liskhq/lisk-db';

import { Logger } from '../logger';
import { BaseModule, BaseModuleChannel } from '../modules';
import { BaseModuleDataAccess, GenesisConfig } from '../types';
import { channelMock } from './mocks/channel_mock';
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

export const getModuleInstance = <
	T1 extends BaseModule,
	T2 = AccountDefaultProps,
	T3 = BlockHeaderAsset
>(
	Module: ModuleClass<T1>,
	opts?: {
		genesisConfig?: GenesisConfig;
		dataAccess?: BaseModuleDataAccess;
		channel?: BaseModuleChannel;
		logger?: Logger;
	},
): T1 => {
	const module = new Module(opts?.genesisConfig ?? ({} as never));

	module.init({
		channel: opts?.channel ?? channelMock,
		logger: opts?.logger ?? loggerMock,
		dataAccess: opts?.dataAccess ?? (new DataAccessMock<T2, T3>() as never),
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

		apiClient.subscribe(APP_EVENT_BLOCK_NEW, data => {
			const { block } = (data as unknown) as Data;
			const { header } = apiClient.block.decode<Block>(block);

			if (header.height >= height) {
				resolve();
			}
		});
	});

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

// Database utils
const defaultDatabasePath = '/tmp/lisk-framework/test';
export const getDBPath = (name: string, dbPath = defaultDatabasePath): string =>
	`${dbPath}/${name}.db`;

export const createDB = (name: string, dbPath = defaultDatabasePath): Database => {
	fs.ensureDirSync(dbPath);
	const filePath = getDBPath(name, dbPath);
	return new Database(filePath);
};

export const removeDB = (dbPath = defaultDatabasePath): void =>
	['forger', 'blockchain', 'node'].forEach(name => fs.removeSync(getDBPath(name, dbPath)));
