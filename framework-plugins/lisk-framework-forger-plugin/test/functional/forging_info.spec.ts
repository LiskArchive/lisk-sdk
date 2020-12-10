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

import { Application, systemDirs } from 'lisk-framework';
import { createIPCClient } from '@liskhq/lisk-api-client';
import {
	createApplication,
	closeApplication,
	getForgerInfoByAddress,
	waitNBlocks,
	getForgerPlugin,
} from '../utils/application';

describe('forger:getForgingInfo action', () => {
	let app: Application;
	let liskClient: any;

	beforeAll(async () => {
		app = await createApplication('forging_info_spec');
		await waitNBlocks(app, 1);
		liskClient = await createIPCClient(systemDirs(app.config.label, app.config.rootPath).dataPath);
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	it('should return list of all forgers info', async () => {
		// Arrange
		const forgerPluginInstance = getForgerPlugin(app);
		const forgersList = forgerPluginInstance['_forgersList'].entries() as ReadonlyArray<
			[Buffer, boolean]
		>;
		const forgersInfo = await Promise.all(
			forgersList.map(async ([forgerAddress, _]) =>
				getForgerInfoByAddress(forgerPluginInstance, forgerAddress.toString('binary')),
			),
		);
		const forgersInfoList = await liskClient.invoke('forger:getForgingInfo');

		// Assert
		expect(forgersInfoList).toHaveLength(forgersInfo.length);
		expect(forgersInfoList).toMatchSnapshot();
		expect(
			forgersInfoList.filter(
				(forger: { totalProducedBlocks: number }) => forger.totalProducedBlocks > 0,
			).length,
		).toBeGreaterThan(1);
	});
});
