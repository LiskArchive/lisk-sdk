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
import * as os from 'os';
import * as fs from 'fs-extra';
import * as path from 'path';
import { TransferTransaction } from '@liskhq/lisk-transactions';
import * as genesisBlockJSON from '../../fixtures/config/devnet/genesis_block.json';
import * as configJSON from '../../fixtures/config/devnet/config.json';
import { Application, ApplicationConfig } from '../../../src';
import { GenesisBlockJSON } from '../../../src/application/genesis_block';
import { genesis } from '../../fixtures';
import { nodeUtils } from '../../utils';

export const createApplication = async (
	label: string,
	consoleLogLevel?: string,
): Promise<Application> => {
	const rootPath = '~/.lisk/functional';
	const config = {
		...configJSON,
		rootPath,
		label,
		logger: {
			consoleLogLevel: consoleLogLevel ?? 'fatal',
			fileLogLevel: 'fatal',
		},
	} as Partial<ApplicationConfig>;

	const app = new Application(genesisBlockJSON as GenesisBlockJSON, config);

	// Remove pre-existing data
	fs.removeSync(path.join(rootPath, label).replace('~', os.homedir()));

	// eslint-disable-next-line @typescript-eslint/no-floating-promises
	await Promise.race([app.run(), new Promise(resolve => setTimeout(resolve, 3000))]);
	await new Promise(resolve => {
		app['_channel'].subscribe('app:block:new', () => {
			if (app['_node']['_chain'].lastBlock.header.height === 2) {
				resolve();
			}
		});
	});
	return app;
};

export const closeApplication = async (app: Application): Promise<void> => {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
	await app['_forgerDB'].clear();
	await app['_blockchainDB'].clear();
	await app.shutdown();
};

export const getPeerID = (app: Application): string => `127.0.0.1:${app.config.network.port}`;

export const waitNBlocks = async (app: Application, n = 1): Promise<void> => {
	const height = app['_node']['_chain'].lastBlock.header.height + n;
	return new Promise(resolve => {
		app['_channel'].subscribe('app:block:new', () => {
			if (app['_node']['_chain'].lastBlock.header.height >= height) {
				resolve();
			}
		});
	});
};

export const sendTransaction = async (app: Application): Promise<TransferTransaction> => {
	const genesisAccount = await app['_node']['_chain'].dataAccess.getAccountByAddress(
		genesis.address,
	);
	const accountWithoutBalance = nodeUtils.createAccount();
	const fundingTx = new TransferTransaction({
		nonce: genesisAccount.nonce,
		senderPublicKey: genesis.publicKey,
		fee: BigInt('200000'),
		asset: {
			recipientAddress: accountWithoutBalance.address,
			amount: BigInt('10000000000'),
			data: '',
		},
	});
	fundingTx.sign(app['_node']['_networkIdentifier'], genesis.passphrase);

	await app['_channel'].invoke('app:postTransaction', {
		transaction: fundingTx.getBytes().toString('base64'),
	});
	return fundingTx;
};
