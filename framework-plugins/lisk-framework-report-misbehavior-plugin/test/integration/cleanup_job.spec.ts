/*
 * Copyright © 2020 Lisk Foundation
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
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import {
	blockHeaderAssetSchema,
	blockHeaderSchema,
	blockSchema,
	transactionSchema,
} from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { testing } from 'lisk-framework';

import { ReportMisbehaviorPlugin } from '../../src';
import { blockHeadersSchema } from '../../src/db';

import * as config from '../../src/defaults/default_config';
import { waitTill } from '../utils/application';

const validPluginOptions = {
	...config.defaultConfig.default,
	encryptedPassphrase:
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1',
};

describe('Clean up old blocks', () => {
	let reportMisbehaviorPlugin: ReportMisbehaviorPlugin;
	const accountSchema = {
		$id: 'accountSchema',
		type: 'object',
		properties: {
			sequence: {
				type: 'object',
				fieldNumber: 3,
				properties: {
					nonce: {
						fieldNumber: 1,
						dataType: 'uint64',
					},
				},
			},
		},
	};
	const channelMock = {
		registerToBus: jest.fn(),
		once: jest.fn(),
		publish: jest.fn(),
		subscribe: jest.fn(),
		isValidEventName: jest.fn(),
		isValidActionName: jest.fn(),
		invoke: jest.fn(),
		eventsList: [],
		actionsList: [],
		actions: {},
		moduleAlias: '',
		options: {},
	} as any;
	const blockHeader1 = Buffer.from(
		'08021080897a18a0f73622209696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b2a20e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8553220addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca93880c8afa025421a08d08e2a10e0dc2a1a10c8c557b5dba8527c0e760124128fd15c4a4056b412aa25c49e5c3cc97257972249fd0ad65f8e431264d9c04b639b46b0839b01ae8d239a354798bae1873c8318a25ef61a8dc9c7a0982da17afb24fbe15c05',
		'hex',
	);
	const dbKey = 'the_db_key';

	beforeEach(async () => {
		reportMisbehaviorPlugin = new ReportMisbehaviorPlugin(validPluginOptions as never);
		(reportMisbehaviorPlugin as any)._channel = channelMock;
		const dataPath = path.join(os.homedir(), '.lisk/report-misbehavior-plugin/data/integration/db');
		await fs.remove(dataPath);
		(reportMisbehaviorPlugin as any).options = {
			fee: '100000000',
			clearBlockHeadersInterval: 1,
			dataPath,
		};
		reportMisbehaviorPlugin.schemas = {
			block: blockSchema,
			blockHeader: blockHeaderSchema,
			blockHeadersAssets: {
				2: blockHeaderAssetSchema,
			},
			transaction: transactionSchema,
			transactionsAssets: [
				{
					moduleID: 5,
					moduleName: 'dpos',
					assetID: 3,
					assetName: 'reportDelegateMisbehavior',
					schema: {
						$id: 'lisk/dpos/pom',
						type: 'object',
						required: ['header1', 'header2'],
						properties: {
							header1: {
								...blockHeaderSchema,
								$id: 'block-header1',
								fieldNumber: 1,
							},
							header2: {
								...blockHeaderSchema,
								$id: 'block-header2',
								fieldNumber: 2,
							},
						},
					},
				},
			],
			account: accountSchema,
		} as any;
		(reportMisbehaviorPlugin as any)._state = {
			passphrase: testing.fixtures.defaultFaucetAccount.passphrase,
			publicKey: testing.fixtures.defaultFaucetAccount.publicKey,
			currentHeight: 1000000000,
		};
	});

	afterEach(async () => {
		await reportMisbehaviorPlugin.unload();
	});

	it('should clear old block headers', async () => {
		await reportMisbehaviorPlugin.load(channelMock);
		await (reportMisbehaviorPlugin as any)._pluginDB.put(
			dbKey,
			codec.encode(blockHeadersSchema, {
				blockHeaders: [blockHeader1],
			}),
		);
		await waitTill(300);
		await expect((reportMisbehaviorPlugin as any)._pluginDB.get(dbKey)).rejects.toThrow(
			`Specified key ${dbKey} does not exist`,
		);
	});
});
