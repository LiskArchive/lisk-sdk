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
import { ForgerPlugin } from '../../../src';
import {
	config,
	getForgerInfoByPublicKey,
	getForgerPlugin,
	waitTill,
} from '../../utils/application';
import { getRandomAccount } from '../../utils/accounts';
import { createTransferTransaction } from '../../utils/transactions';
import { getGenesisBlockJSON } from '../../utils/genesis_block';

describe('Forger Info Sync', () => {
	let appEnv: testing.ApplicationEnv;
	let accountNonce = 0;
	let networkIdentifier: Buffer;

	beforeAll(async () => {
		const dataPath = '~/.lisk/forger-plugin';
		if (existsSync(dataPath)) {
			rmdirSync(dataPath, { recursive: true });
		}
		const modules = [TokenModule, SequenceModule, KeysModule, DPoSModule];
		const genesisBlock = getGenesisBlockJSON({
			timestamp: Math.floor(Date.now() / 1000) - 30,
		});
		config.label = 'sync';
		appEnv = new testing.ApplicationEnv({
			modules,
			config,
			plugins: [ForgerPlugin],
			genesisBlock,
		});
		await appEnv.startApplication();
		// The test application generates a dynamic genesis block so we need to get the networkID like this
		networkIdentifier = appEnv.networkIdentifier;
	});

	afterAll(async () => {
		const options: { clearDB: boolean } = { clearDB: true };
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication(options);
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
		await appEnv.ipcClient.invoke('app:postTransaction', {
			transaction: transaction.getBytes().toString('hex'),
		});
		await appEnv.waitNBlocks(1);
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
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication({ clearDB: false });

		// Start the application again
		await appEnv.startApplication();
		forgerPluginInstance = getForgerPlugin(appEnv.application);

		await waitTill(2000);
		// Get forger info
		const forgerInfoAfterRestart = await getForgerInfoByPublicKey(
			forgerPluginInstance,
			generatorPublicKey.toString('hex'),
		);

		// Assert
		expect(forgerInfo).toEqual(forgerInfoAfterRestart);
	});
});
