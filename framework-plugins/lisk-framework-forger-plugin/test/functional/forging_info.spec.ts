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

import { KeysModule, SequenceModule, testing, TokenModule, DPoSModule } from 'lisk-framework';
import { rmdirSync, existsSync } from 'fs';
import { ForgerPlugin } from '../../src';
import { config, getForgerInfoByAddress, getForgerPlugin } from '../utils/application';
import { getGenesisBlockJSON } from '../utils/genesis_block';

describe('forger:getForgingInfo action', () => {
	let appEnv: testing.ApplicationEnv;

	beforeAll(async () => {
		const dataPath = '~/.lisk/forger-plugin';
		if (existsSync(dataPath)) {
			rmdirSync(dataPath, { recursive: true });
		}
		const modules = [TokenModule, SequenceModule, KeysModule, DPoSModule];
		const genesisBlock = getGenesisBlockJSON({
			timestamp: Math.floor(Date.now() / 1000) - 30,
		});
		config.label = 'forging_info_spec';
		appEnv = new testing.ApplicationEnv({
			modules,
			config,
			plugins: [ForgerPlugin],
			genesisBlock,
		});
		await appEnv.startApplication();
		await appEnv.waitNBlocks(2);
	});

	afterAll(async () => {
		const options: { clearDB: boolean } = { clearDB: true };
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication(options);
	});

	it('should return list of all forgers info', async () => {
		// Arrange
		const forgerPluginInstance = getForgerPlugin(appEnv.application);
		const forgersList = forgerPluginInstance['_forgersList'].entries() as ReadonlyArray<
			[Buffer, boolean]
		>;
		const forgersInfo = await Promise.all(
			forgersList.map(async ([forgerAddress, _]) =>
				getForgerInfoByAddress(forgerPluginInstance, forgerAddress.toString('binary')),
			),
		);
		const forgersInfoList = await appEnv.ipcClient.invoke('forger:getForgingInfo');

		// Assert
		expect(forgersInfoList).toHaveLength(forgersInfo.length);
		expect(forgersInfoList).toMatchSnapshot();
		expect(
			(forgersInfoList as any).filter(
				(forger: { totalProducedBlocks: number }) => forger.totalProducedBlocks > 0,
			).length,
		).toBeGreaterThan(1);
	});
});
