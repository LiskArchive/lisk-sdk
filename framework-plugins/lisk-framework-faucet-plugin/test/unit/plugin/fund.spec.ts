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
 */

import { transactionSchema } from '@liskhq/lisk-chain';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { when } from 'jest-when';
import { FaucetPlugin } from '../../../src/plugin';
import { config } from '../../../src/plugin/defaults';

const validPluginOptions = {
	...config.default,
	encryptedPassphrase:
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1',
};

describe('fund tokens action', () => {
	let faucetPlugin: FaucetPlugin;
	let fundTokensAction: any;
	const defaultState = {
		publicKey: Buffer.from(
			'63db01b67a7f97dbf841bc7172e9ce460dd8a208141abd225f2a6f76e09af1b2',
			'hex',
		),
		passphrase:
			'raccoon morning trip mystery dismiss eye hundred purse gesture change elbow trophy',
	};
	const defaultNetworkIdentifier =
		'93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e';
	const defaultAddress = 'af9048d0fb04b1d74d966bd6a53bdeb394274c2d';
	const defaultParams = {
		address: defaultAddress,
	};
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

	beforeEach(async () => {
		faucetPlugin = new FaucetPlugin(validPluginOptions as never);
		faucetPlugin.schemas = {
			transaction: transactionSchema,
			account: accountSchema,
			transactionsAssets: [
				{
					moduleID: 2,
					moduleName: 'token',
					assetID: 0,
					assetName: 'transfer',
					schema: {
						$id: 'lisk/transfer-asset',
						title: 'Transfer transaction asset',
						type: 'object',
						required: ['amount', 'recipientAddress', 'data'],
						properties: {
							amount: {
								dataType: 'uint64',
								fieldNumber: 1,
							},
							recipientAddress: {
								dataType: 'bytes',
								fieldNumber: 2,
								minLength: 20,
								maxLength: 20,
							},
							data: {
								dataType: 'string',
								fieldNumber: 3,
								minLength: 0,
								maxLength: 64,
							},
						},
					},
				},
			],
		} as any;
		when(channelMock.invoke)
			.calledWith('app:postTransaction')
			.mockResolvedValue({ result: { transactionId: '12345' } } as never);
		when(channelMock.invoke)
			.calledWith('app:getAccount')
			.mockResolvedValue('1a020801' as never);
		when(channelMock.invoke)
			.calledWith('app:getNodeInfo')
			.mockResolvedValue({ networkIdentifier: defaultNetworkIdentifier } as never);
		fundTokensAction = faucetPlugin.actions.fundTokens;
		await faucetPlugin.load(channelMock);
	});

	it('should error if action input is invalid', async () => {
		await expect(fundTokensAction({ x: 1 })).rejects.toThrow(LiskValidationError);
	});

	it('should not fund account if unauthorized', async () => {
		await expect(fundTokensAction(defaultParams)).rejects.toThrow('Faucet is not enabled.');
	});

	it('should fund account if authorized', async () => {
		(faucetPlugin as any)._state = defaultState;
		const response = await fundTokensAction(defaultParams);

		expect(response.result).toContain(`Successfully funded account at address: ${defaultAddress}`);
	});
});
