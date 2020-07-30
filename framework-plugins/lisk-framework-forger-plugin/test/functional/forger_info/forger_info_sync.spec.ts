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

import {
	closeApplication,
	createApplication,
	getForgerInfoByPublicKey,
	getForgerPlugin,
	startApplication,
	waitNBlocks,
	waitTill,
} from '../../utils/application';
import { getRandomAccount } from '../../utils/accounts';
import { createTransferTransaction } from '../../utils/transactions';

describe('Forger Info Sync', () => {
	let app: Application;
	let accountNonce = 0;

	beforeAll(async () => {
		app = await createApplication('sync');
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	it('should sync information from scratch on startup', async () => {
		// Arrange
		let forgerPluginInstance = getForgerPlugin(app);
		const account = getRandomAccount();
		const transaction = createTransferTransaction({
			amount: '2',
			recipientAddress: account.address,
			fee: '0.3',
			nonce: accountNonce,
		});
		accountNonce += 1;
		await app['_channel'].invoke('app:postTransaction', {
			transaction: transaction.getBytes().toString('base64'),
		});
		await waitNBlocks(app, 1);
		await waitTill(2000);
		const { generatorPublicKey } = app['_node']['_chain'].lastBlock.header;
		const forgerInfo = await getForgerInfoByPublicKey(forgerPluginInstance, generatorPublicKey);
		// Make sure forger info is not changed
		expect(forgerInfo).toMatchSnapshot();

		// Act
		// Reset forger info manually
		await forgerPluginInstance['_forgerPluginDB'].clear();

		// Close application
		await closeApplication(app, { clearDB: false });

		// Start the application again
		await startApplication(app);
		forgerPluginInstance = getForgerPlugin(app);

		await waitTill(2000);
		// Get forger info
		const forgerInfoAfterRestart = await getForgerInfoByPublicKey(
			forgerPluginInstance,
			generatorPublicKey,
		);

		// Assert
		expect(forgerInfo).toEqual(forgerInfoAfterRestart);
	});
});
