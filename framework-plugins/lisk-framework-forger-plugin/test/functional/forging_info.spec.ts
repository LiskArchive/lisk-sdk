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

import { testing } from 'lisk-framework';
import {
	createApplicationEnv,
	getForgerInfoByAddress,
	waitNBlocks,
	getForgerPlugin,
	closeApplicationEnv,
} from '../utils/application';

describe('forger:getForgingInfo action', () => {
	let appEnv: testing.ApplicationEnv;

	beforeAll(async () => {
		appEnv = createApplicationEnv('forging_info_spec');
		await appEnv.startApplication();
		await waitNBlocks(appEnv.application, 2);
	});

	afterAll(async () => {
		await closeApplicationEnv(appEnv);
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
