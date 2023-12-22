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

import { testing, Types } from 'lisk-sdk';
import { getForgerInfoByAddress, getForgerPlugin } from '../utils/application';
import { ForgerPlugin } from '../../src';

describe('forger:getForgingInfo action', () => {
	let appEnv: testing.ApplicationEnv;

	beforeAll(async () => {
		const rootPath = '~/.lisk/forger-plugin';
		const config = {
			rootPath,
			label: 'forging_info_functional',
		} as Types.PartialApplicationConfig;

		appEnv = testing.createDefaultApplicationEnv({
			config,
			plugins: [new ForgerPlugin()],
		});
		await appEnv.startApplication();
		await appEnv.waitNBlocks(2);
	});

	afterAll(async () => {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication();
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
		const forgersInfoList = await appEnv.ipcClient.invoke<{ address: string }[]>(
			'forger:getForgingInfo',
		);

		// Assert
		expect(forgersInfoList).toHaveLength(forgersInfo.length);
		// Returned forgers list should contain all the forger info provided
		expect(
			forgersInfoList
				.map(f =>
					forgersList.findIndex(([forgerAddress, _]) =>
						forgerAddress.equals(Buffer.from(f.address, 'hex')),
					),
				)
				.filter(i => i < 0),
		).toHaveLength(0);
		expect(
			(forgersInfoList as any).filter(
				(forger: { totalProducedBlocks: number }) => forger.totalProducedBlocks > 0,
			).length,
		).toBeGreaterThan(1);
	});
});
