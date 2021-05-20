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

import { when } from 'jest-when';
import { blockHeaderSchema, blockSchema, transactionSchema } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { testing } from 'lisk-framework';

import { ReportMisbehaviorPlugin } from '../../src';
import * as config from '../../src/defaults/default_config';

const validPluginOptions = {
	...config.defaultConfig.default,
	encryptedPassphrase:
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1',
	dataPath: '/my/app',
};

describe('Send PoM transaction', () => {
	let reportMisbehaviorPlugin: ReportMisbehaviorPlugin;
	const defaultNetworkIdentifier =
		'93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e';
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
	const blockHeader2 = Buffer.from(
		'080210c08db7011880ea3022209696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b2a20e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8553220addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca93880c8afa025421a08e0dc2a10e0dc2a1a10c8c557b5dba8527c0e760124128fd15c4a40d90764813046127a50acf4b449fccad057944e7665ab065d7057e56983e42abe55a3cbc1eb35a8c126f54597d0a0b426f2ad9a2d62769185ad8e3b4a5b3af909',
		'hex',
	);
	const header1 = codec.decode(blockHeaderSchema, blockHeader1);
	const header2 = codec.decode(blockHeaderSchema, blockHeader2);

	beforeEach(() => {
		reportMisbehaviorPlugin = new ReportMisbehaviorPlugin(validPluginOptions as never);
		(reportMisbehaviorPlugin as any)._channel = channelMock;
		(reportMisbehaviorPlugin as any)._options = { fee: '100000000' };
		reportMisbehaviorPlugin['_logger'] = {
			error: jest.fn(),
		} as any;
		reportMisbehaviorPlugin.schemas = {
			block: blockSchema,
			blockHeader: blockHeaderSchema,
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
		};
		when(channelMock.invoke)
			.calledWith('app:getAccount', expect.anything())
			.mockResolvedValue('1a020801' as never);
		when(channelMock.invoke)
			.calledWith('app:getNodeInfo')
			.mockResolvedValue({ networkIdentifier: defaultNetworkIdentifier } as never);
	});

	it('should throw error when pom transaction asset schema is not found', async () => {
		reportMisbehaviorPlugin.schemas.transactionsAssets = [];
		await expect(
			(reportMisbehaviorPlugin as any)._createPoMTransaction(header1, header2),
		).rejects.toThrow('PoM asset schema is not registered in the application.');
	});

	it('should create pom transaction for given block headers', async () => {
		const pomTransaction = await (reportMisbehaviorPlugin as any)._createPoMTransaction(
			header1,
			header2,
		);
		expect(pomTransaction).toMatchSnapshot();
	});
});
