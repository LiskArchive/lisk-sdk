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

import { BaseChannel, GenesisConfig } from 'lisk-framework';
import { codec } from '@liskhq/lisk-codec';
import { ReportMisbehaviorPlugin } from '../../src';
import { configSchema } from '../../src/schemas';

const appConfigForPlugin = {
	rootPath: '~/.lisk',
	label: 'my-app',
	logger: {
		consoleLogLevel: 'info',
		fileLogLevel: 'none',
		logFileName: 'plugin-MisbehaviourPlugin.log',
	},
	rpc: {
		modes: ['ipc'],
		ws: {
			port: 8080,
			host: '127.0.0.1',
			path: '/ws',
		},
		http: {
			port: 8000,
			host: '127.0.0.1',
		},
	},
	forging: {
		force: false,
		waitThreshold: 2,
		delegates: [],
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
	genesisConfig: {} as GenesisConfig,
};

const validPluginOptions = {
	...configSchema.default,
	encryptedPassphrase:
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1',
	dataPath: '/my/app',
};

const channelMock1 = {
	invoke: jest.fn(),
	once: jest.fn().mockImplementation((_eventName, cb) => cb()),
};

describe('subscribe to event', () => {
	let reportMisbehaviorPlugin: ReportMisbehaviorPlugin;
	let subscribeMock: jest.Mock;
	beforeEach(async () => {
		subscribeMock = jest.fn();
		const channelMock = {
			subscribe: subscribeMock,
		};
		reportMisbehaviorPlugin = new ReportMisbehaviorPlugin();
		await reportMisbehaviorPlugin.init({
			config: validPluginOptions,
			channel: (channelMock1 as unknown) as BaseChannel,
			appConfig: appConfigForPlugin,
		});
		(reportMisbehaviorPlugin as any)._channel = channelMock;
		reportMisbehaviorPlugin['logger'] = {
			error: jest.fn(),
		} as any;
	});

	it('should register listener to network:event', () => {
		// Act
		reportMisbehaviorPlugin['_subscribeToChannel']();
		// Assert
		expect(subscribeMock).toHaveBeenCalledTimes(1);
		expect(subscribeMock).toHaveBeenCalledWith('app:network:event', expect.any(Function));
	});

	it('should not decode block when data is invalid', () => {
		jest.spyOn(codec, 'decode');
		// Act
		reportMisbehaviorPlugin['_subscribeToChannel']();
		subscribeMock.mock.calls[0][1]({ event: 'postBlock', data: null });
		// Assert
		expect(codec.decode).not.toHaveBeenCalled();
	});
});
