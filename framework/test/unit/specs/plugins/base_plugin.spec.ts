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
import { BaseTransaction, TransferTransaction } from '@liskhq/lisk-transactions';

import { BaseChannel, BasePlugin } from '../../../../src';

class MyPlugin extends BasePlugin {
	public constructor(options: object = {}) {
		super(options);
	}

	public static get alias() {
		return 'my_plugin';
	}

	public static get info() {
		return {
			author: 'John Do',
			version: '1.0',
			name: 'my_plugin',
		};
	}

	// eslint-disable-next-line class-methods-use-this
	public get events() {
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	public get actions() {
		return {};
	}

	// eslint-disable-next-line class-methods-use-this
	public async load(_channel: BaseChannel) {
		return Promise.resolve();
	}

	// eslint-disable-next-line class-methods-use-this
	public async unload() {
		return Promise.resolve();
	}
}

const channelMock = {
	invoke: jest.fn(),
	once: jest.fn().mockImplementation((_eventName, cb) => cb()),
};

const schemas = {
	account: {},
	baseTransaction: BaseTransaction.BASE_SCHEMA,
	transactionsAssets: {
		[TransferTransaction.TYPE]: TransferTransaction.ASSET_SCHEMA,
	},
	blockHeader: {},
	blockHeadersAssets: {},
};

describe('BasePlugin', () => {
	let plugin: MyPlugin;

	beforeEach(() => {
		plugin = new MyPlugin();

		when(channelMock.invoke).calledWith('app:getSchema').mockResolvedValue(schemas);
	});

	describe('constructor', () => {
		it('should assign "codec" namespace', () => {
			expect(plugin.codec).toEqual(
				expect.objectContaining({
					decodeTransaction: expect.any(Function),
				}),
			);
		});
	});

	describe('init', () => {
		it('should fetch schemas and assign to instance', async () => {
			// Act
			await plugin.init((channelMock as unknown) as BaseChannel);

			// Assert
			expect(channelMock.once).toHaveBeenCalledTimes(1);
			expect(channelMock.once).toHaveBeenCalledWith('app:ready', expect.any(Function));
			expect(channelMock.invoke).toHaveBeenCalledTimes(1);
			expect(channelMock.invoke).toHaveBeenCalledWith('app:getSchema');
			expect(plugin.schemas).toBe(schemas);
		});
	});
});
