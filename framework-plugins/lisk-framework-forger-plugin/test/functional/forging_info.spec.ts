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

import { Application } from 'lisk-framework';
import axios from 'axios';
import { ForgerPlugin } from '../../src';
import {
	createApplication,
	closeApplication,
	getForgerInfo,
	waitNBlocks,
	getURL,
} from '../utils/application';
import { Forger, ForgerInfo } from '../../src/types';

describe('Forger endpoint', () => {
	let app: Application;

	beforeAll(async () => {
		app = await createApplication('forging_info_spec');
		await waitNBlocks(app, 1);
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('GET /api/forging/info', () => {
		let result: any;

		beforeEach(async () => {
			result = await axios.get(getURL('/api/forging/info'));
		});

		it('should return list of all forgers info', async () => {
			// Arrange
			const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];
			const forgersList = forgerPluginInstance['_forgersList'] as ReadonlyArray<Forger>;
			const forgersInfo = await Promise.all(
				forgersList.map(async forger => getForgerInfo(forgerPluginInstance, forger.address)),
			);

			// Assert
			expect(result.data).toHaveLength(forgersInfo.length);
			expect(Object.keys(result.data[0])).toEqual([
				'address',
				'username',
				'totalVotesReceived',
				'totalReceivedFees',
				'totalReceivedRewards',
				'totalProducedBlocks',
				'consecutiveMissedBlocks',
				'forging',
			]);
			expect(
				forgersInfo.map(f => ({
					totalProducedBlocks: f.totalProducedBlocks,
					totalReceivedFees: f.totalReceivedFees,
					totalReceivedRewards: f.totalReceivedRewards,
				})),
			).toEqual(
				result.data.map((d: Partial<ForgerInfo>) => ({
					totalProducedBlocks: d.totalProducedBlocks,
					totalReceivedFees: d.totalReceivedFees,
					totalReceivedRewards: d.totalReceivedRewards,
				})),
			);
		});
	});
});
