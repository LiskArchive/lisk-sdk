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
import { Data, ModuleClass, WaitOptions } from './types';

export const getAccountSchemaFromModules = (
	modules: ModuleClass[],
	genesisConfig?: GenesisConfig,
): { [key: string]: AccountSchema } => {
	const accountSchemas: { [key: string]: AccountSchema } = {};

	for (const Klass of modules) {
		const m = new Klass(genesisConfig ?? ({} as never));
		if (m.accountSchema) {
			accountSchemas[m.name] = m.accountSchema as AccountSchema;
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
}: WaitOptions): Promise<void> =>
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
