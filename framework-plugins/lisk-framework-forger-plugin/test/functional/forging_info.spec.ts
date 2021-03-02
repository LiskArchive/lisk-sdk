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

import {
	createApplicationEnv,
	closeApplicationEnv,
	getForgerInfoByAddress,
	waitNBlocks,
	getForgerPlugin,
	ApplicationEnvInterface,
} from '../utils/application';

describe('forger:getForgingInfo action', () => {
	let appEnv: ApplicationEnvInterface;

	beforeAll(async () => {
		appEnv = await createApplicationEnv('forging_info_spec');
		await waitNBlocks(appEnv.application, 2);
	});

	afterAll(async () => {
		await appEnv.apiClient.disconnect();
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
		const forgersInfoList = await appEnv.apiClient.invoke('forger:getForgingInfo');

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
