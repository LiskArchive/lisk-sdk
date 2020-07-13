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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

import axios from 'axios';
import { closeApplication, createApplication, getURL, waitTill } from '../../utils/application';
import { ForgerPlugin } from '../../../src';

const getForgerInfo = async (forgerPluginInstance: ForgerPlugin, generatorPublicKey: string) => {
	const forgerAddress = getAddressFromPublicKey(Buffer.from(generatorPublicKey, 'base64')).toString(
		'base64',
	);
	const forgerInfo = await forgerPluginInstance['_getForgerInfo'](forgerAddress);

	return forgerInfo;
};

describe('Forger Info', () => {
	let app: Application;
	beforeAll(async () => {
		app = await createApplication('transactions');
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('New/Delete Block', () => {
		describe('Add forger info', () => {
			it('should save forger info after new block', async () => {
				// Arrange
				const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];

				// Act
				const result = await axios.get(getURL('/api/blocks/?height=1'));
				const {
					data: {
						data: {
							header: { generatorPublicKey, reward },
						},
					},
				} = result;
				const forgerInfo = await getForgerInfo(forgerPluginInstance, generatorPublicKey);

				// Assert
				expect(Object.keys(forgerInfo)).toEqual([
					'totalProducedBlocks',
					'totalReceivedFees',
					'totalReceivedRewards',
					'votesReceived',
				]);
				expect(forgerInfo.totalProducedBlocks).toEqual(1);
				expect(forgerInfo.totalReceivedRewards).toEqual(BigInt(reward));
				expect(forgerInfo.totalReceivedFees).toEqual(BigInt(0));
				expect(forgerInfo.votesReceived).toEqual([]);
			});
		});

		describe('Delete forger info', () => {
			it('should update forger info after delete block', async () => {
				// Arrange
				const { generatorPublicKey } = app['_node']['_chain'].lastBlock.header;
				await app['_node']['_processor'].deleteLastBlock();
				const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];

				// Act
				// Wait for few milliseconds to save updated forger info
				await waitTill(50);

				// Asserts
				await expect(getForgerInfo(forgerPluginInstance, generatorPublicKey)).resolves.toEqual({
					totalProducedBlocks: 0,
					totalReceivedFees: BigInt(0),
					totalReceivedRewards: BigInt(0),
					votesReceived: [],
				});
			});
		});
	});
});
