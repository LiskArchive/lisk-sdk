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
import { Application, ApplicationConfig } from 'lisk-framework';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import * as configJSON from '../fixtures/config.json';
import { ForgerPlugin } from '../../src';
import { getForgerInfo as getForgerInfoFromDB } from '../../src/db';
import { getGenesisBlockJSON } from './genesis_block';
import { ForgerInfo } from '../../src/types';

const forgerApiPort = 5001;

export const getForgerPlugin = (app: Application): ForgerPlugin => {
	return app['_controller']['_inMemoryPlugins'][ForgerPlugin.alias]['plugin'];
};

export const startApplication = async (app: Application): Promise<void> => {
	// TODO: Need to figure out why below error appears but its only in tests
	//  Trace: Error: schema with key or id "/block/header"
	validator.removeSchema('/block/header');

	await Promise.race([app.run(), new Promise(resolve => setTimeout(resolve, 3000))]);
	await new Promise(resolve => {
		app['_channel'].subscribe('app:block:new', () => {
			if (app['_node']['_chain'].lastBlock.header.height > 1) {
				resolve();
			}
		});
	});
};

export const createApplication = async (
	label: string,
	options: {
		consoleLogLevel?: string;
		clearDB?: boolean;
		appConfig?: { plugins: { forger: object } };
	} = {
		clearDB: true,
		consoleLogLevel: 'fatal',
		appConfig: { plugins: { forger: {} } },
	},
): Promise<Application> => {
	const rootPath = '~/.lisk/forger-plugin';
	const config = ({
		...configJSON,
		rootPath,
		label,
		logger: {
			consoleLogLevel: options.consoleLogLevel,
			fileLogLevel: 'fatal',
		},
		network: {
			maxInboundConnections: 0,
		},
		plugins: {
			forger: {
				port: forgerApiPort,
				...options.appConfig?.plugins.forger,
			},
		},
	} as unknown) as Partial<ApplicationConfig>;

	// Update the genesis block JSON to avoid having very long calculations of missed blocks in tests
	const genesisBlock = getGenesisBlockJSON({
		timestamp: Math.floor(Date.now() / 1000) - 30,
	});

	const app = new Application(genesisBlock, config);
	app.registerPlugin(ForgerPlugin, { loadAsChildProcess: false });

	if (options.clearDB) {
		// Remove pre-existing data
		fs.removeSync(path.join(rootPath, label).replace('~', os.homedir()));
	}

	await startApplication(app);
	return app;
};

export const closeApplication = async (
	app: Application,
	options: { clearDB: boolean } = { clearDB: true },
): Promise<void> => {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);

	if (options.clearDB) {
		await app['_forgerDB'].clear();
		await app['_blockchainDB'].clear();
		const forgerPluginInstance = getForgerPlugin(app);
		await forgerPluginInstance['_forgerPluginDB'].clear();
	}

	await app.shutdown();
};

export const getURL = (url: string, port = forgerApiPort): string =>
	`http://localhost:${port}${url}`;

export const waitNBlocks = async (app: Application, n = 1): Promise<void> => {
	// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
	const height = app['_node']['_chain'].lastBlock.header.height + n;
	return new Promise(resolve => {
		app['_channel'].subscribe('app:block:new', () => {
			if (app['_node']['_chain'].lastBlock.header.height >= height) {
				resolve();
			}
		});
	});
};

export const waitTill = async (ms: number) =>
	new Promise(r =>
		setTimeout(() => {
			r();
		}, ms),
	);

export const callNetwork = async (
	promise: Promise<any>,
): Promise<{ status: number; response: any }> => {
	let response;
	let status;

	try {
		const result = await promise;
		response = result.data;
		status = result.status;
	} catch (error) {
		status = error.response.status;
		response = error.response.data;
	}

	return { status, response };
};

export const getForgerInfoByPublicKey = async (
	forgerPluginInstance: ForgerPlugin,
	generatorPublicKey: string,
): Promise<ForgerInfo> => {
	const forgerAddress = getAddressFromPublicKey(Buffer.from(generatorPublicKey, 'base64')).toString(
		'binary',
	);

	const forgerInfo = await getForgerInfoFromDB(
		forgerPluginInstance['_forgerPluginDB'],
		forgerAddress,
	);

	return forgerInfo;
};

export const getForgerInfoByAddress = async (
	forgerPluginInstance: ForgerPlugin,
	forgerAddress: string,
): Promise<ForgerInfo> => {
	const forgerInfo = await getForgerInfoFromDB(
		forgerPluginInstance['_forgerPluginDB'],
		forgerAddress,
	);

	return forgerInfo;
};
