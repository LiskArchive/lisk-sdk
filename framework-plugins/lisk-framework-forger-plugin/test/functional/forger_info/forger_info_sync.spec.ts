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
	closeApplicationEnv,
	getForgerInfoByPublicKey,
	getForgerPlugin,
	waitNBlocks,
	waitTill,
} from '../../utils/application';
import { getRandomAccount } from '../../utils/accounts';
import { createTransferTransaction } from '../../utils/transactions';

describe('Forger Info Sync', () => {
	let appEnv: testing.ApplicationEnv;
	let accountNonce = 0;
	let networkIdentifier: Buffer;

	beforeAll(async () => {
		appEnv = createApplicationEnv('sync');
		await appEnv.startApplication();
		// The test application generates a dynamic genesis block so we need to get the networkID like this
		networkIdentifier = appEnv.networkIdentifier;
	});

	afterAll(async () => {
		await closeApplicationEnv(appEnv);
	});

	it('should sync information from scratch on startup', async () => {
		// Arrange
		let forgerPluginInstance = getForgerPlugin(appEnv.application);
		const account = getRandomAccount();
		const transaction = createTransferTransaction({
			amount: '2',
			recipientAddress: account.address,
			fee: '0.3',
			nonce: accountNonce,
			networkIdentifier,
		});
		accountNonce += 1;
		await appEnv.application['_channel'].invoke('app:postTransaction', {
			transaction: transaction.getBytes().toString('hex'),
		});
		await waitNBlocks(appEnv.application, 1);
		await waitTill(2000);
		const { generatorPublicKey } = appEnv.lastBlock.header;
		const forgerInfo = await getForgerInfoByPublicKey(
			forgerPluginInstance,
			generatorPublicKey.toString('hex'),
		);
		// Make sure forger info is not changed
		expect(forgerInfo).toMatchSnapshot();

		// Act
		// Reset forger info manually
		await forgerPluginInstance['_forgerPluginDB'].clear();

		// Close application
		await closeApplicationEnv(appEnv, { clearDB: false });

		// Start the application again
		await appEnv.startApplication();
		forgerPluginInstance = getForgerPlugin(appEnv.application);

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
