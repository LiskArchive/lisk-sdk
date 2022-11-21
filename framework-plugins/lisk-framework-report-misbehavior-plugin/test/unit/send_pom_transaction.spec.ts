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

import { utils } from '@liskhq/lisk-cryptography';
import { testing, chain, ApplicationConfigForPlugin } from 'lisk-sdk';
import { when } from 'jest-when';

import { ReportMisbehaviorPlugin } from '../../src';
import { configSchema } from '../../src/schemas';

const appConfigForPlugin: ApplicationConfigForPlugin = {
	...testing.fixtures.defaultConfig,
};

const validPluginOptions = {
	...configSchema.default,
	encryptedPassphrase:
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1',
	dataPath: '/my/app',
};

describe('Send PoM transaction', () => {
	let reportMisbehaviorPlugin: ReportMisbehaviorPlugin;
	const defaultchainID = '93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e';
	const random32Bytes = Buffer.from(
		'3d1b5dd1ef4ff7b22359598ebdf58966a51adcc03e02ad356632743e65898990',
		'hex',
	);
	const random20Bytes = Buffer.from('40ff452fae2affe6eeef3c30e53e9eac35a1bc43', 'hex');
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
		moduleName: '',
		options: {},
	} as any;
	const header1 = new chain.BlockHeader({
		height: 100,
		aggregateCommit: {
			aggregationBits: Buffer.alloc(0),
			certificateSignature: Buffer.alloc(0),
			height: 0,
		},
		impliesMaxPrevotes: false,
		generatorAddress: random20Bytes,
		maxHeightGenerated: 0,
		maxHeightPrevoted: 50,
		previousBlockID: random32Bytes,
		timestamp: 100,
		version: 2,
		assetRoot: random32Bytes,
		eventRoot: random32Bytes,
		stateRoot: random32Bytes,
		transactionRoot: random32Bytes,
		validatorsHash: random32Bytes,
		signature: random32Bytes,
	});
	const header2 = new chain.BlockHeader({
		...header1.toObject(),
		height: 100,
		maxHeightPrevoted: 32,
	});

	beforeEach(async () => {
		reportMisbehaviorPlugin = new ReportMisbehaviorPlugin();
		reportMisbehaviorPlugin['_apiClient'] = {
			schema: {
				block: chain.blockSchema,
				header: chain.blockHeaderSchema,
				transaction: chain.transactionSchema,
			},
			metadata: [
				{
					id: utils.intToBuffer(13, 4).toString('hex'),
					name: 'pos',
					commands: [
						{
							id: utils.intToBuffer(3, 4).toString('hex'),
							name: 'reportDelegateMisbehavior',
							params: {
								$id: '/lisk/pos/pom',
								type: 'object',
								required: ['header1', 'header2'],
								properties: {
									header1: {
										...chain.blockHeaderSchema,
										$id: 'blockHeader1',
										fieldNumber: 1,
									},
									header2: {
										...chain.blockHeaderSchema,
										$id: 'blockHeader2',
										fieldNumber: 2,
									},
								},
							},
						},
					],
				},
			],
			invoke: jest.fn(),
			subscribe: jest.fn(),
		};
		await reportMisbehaviorPlugin.init({
			config: validPluginOptions,
			appConfig: appConfigForPlugin,
			logger: testing.mocks.loggerMock,
		});
		(reportMisbehaviorPlugin as any)._channel = channelMock;
		(reportMisbehaviorPlugin as any)._options = { fee: '100000000' };
		reportMisbehaviorPlugin['logger'] = {
			error: jest.fn(),
		} as any;
		(reportMisbehaviorPlugin as any)._state = {
			privateKey: Buffer.from(testing.fixtures.defaultFaucetAccount.privateKey, 'hex'),
			publicKey: Buffer.from(testing.fixtures.defaultFaucetAccount.publicKey, 'hex'),
		};

		when(jest.spyOn(reportMisbehaviorPlugin['apiClient'], 'invoke'))
			.calledWith('auth_getAuthAccount', expect.anything())
			.mockResolvedValue({ nonce: '0' } as never)
			.calledWith('system_getNodeInfo')
			.mockResolvedValue({ chainID: defaultchainID } as never);
	});

	it('should throw error when pom transaction params schema is not found', async () => {
		reportMisbehaviorPlugin['_apiClient'] = {
			schema: {
				block: chain.blockSchema,
				header: chain.blockHeaderSchema,
				transaction: chain.transactionSchema,
			},
			metadata: [
				{
					id: utils.intToBuffer(13, 4).toString('hex'),
					name: 'pos',
					commands: [],
				},
			],
			invoke: jest.fn(),
			subscribe: jest.fn(),
		};
		await expect(
			(reportMisbehaviorPlugin as any)._createPoMTransaction(header1, header2),
		).rejects.toThrow('PoM params schema is not registered in the application.');
	});

	it('should create pom transaction for given block headers', async () => {
		const pomTransaction = await (reportMisbehaviorPlugin as any)._createPoMTransaction(
			header1,
			header2,
		);
		expect(pomTransaction).toMatchSnapshot();
	});
});
