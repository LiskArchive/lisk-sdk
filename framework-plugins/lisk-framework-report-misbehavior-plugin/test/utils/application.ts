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
import { Application, PartialApplicationConfig } from 'lisk-framework';
import { validator } from '@liskhq/lisk-validator';
import * as configJSON from '../fixtures/config.json';
import * as genesisBlock from '../fixtures/genesis_block.json';
import { ReportMisbehaviorPlugin } from '../../src';
import { defaultAccount } from '../fixtures/devnet';

const apiPort = 5002;

export const getReportMisbehaviorPlugin = (app: Application): ReportMisbehaviorPlugin => {
	return app['_controller']['_inMemoryPlugins'][ReportMisbehaviorPlugin.alias]['plugin'];
};

export const startApplication = async (app: Application): Promise<void> => {
	// FIXME: Remove with #5572
	validator.removeSchema('/block/header');

	await Promise.race([app.run(), new Promise(resolve => setTimeout(resolve, 3000))]);
	await new Promise<void>(resolve => {
		app['_channel'].subscribe('app:block:new', () => {
			if (app['_node']['_chain'].lastBlock.header.height > 1) {
				resolve();
			}
		});
	});
};

export const getApplication = (
	label: string,
	options: {
		consoleLogLevel?: string;
		clearDB?: boolean;
		appConfig?: { plugins: { reportMisbehavior: object } };
	} = {
		clearDB: true,
		consoleLogLevel: 'fatal',
		appConfig: { plugins: { reportMisbehavior: {} } },
	},
): Application => {
	const rootPath = '~/.lisk/report-misbehavior-plugin';
	const config = {
		...configJSON,
		rootPath,
		label,
		logger: {
			consoleLogLevel: options.consoleLogLevel ?? 'fatal',
			fileLogLevel: 'fatal',
			logFileName: 'lisk.log',
		},
		network: {
			...configJSON.network,
			maxInboundConnections: 0,
		},
		plugins: {
			reportMisbehavior: {
				port: apiPort,
				encryptedPassphrase: defaultAccount.encryptedPassphrase,
			},
		},
		rpc: {
			enable: true,
			port: 8080,
			mode: 'ipc',
		},
	} as PartialApplicationConfig;

	const genesis = {
		...genesisBlock,
		header: { ...genesisBlock.header, timestamp: Math.floor(Date.now() / 1000) },
	};
	const app = Application.defaultApplication(genesis, config);
	app.registerPlugin(ReportMisbehaviorPlugin, { loadAsChildProcess: false });
	return app;
};

export const createApplication = async (
	label: string,
	options: {
		consoleLogLevel?: string;
		clearDB?: boolean;
		appConfig?: { plugins: { reportMisbehavior: object } };
	} = {
		clearDB: true,
		consoleLogLevel: 'fatal',
		appConfig: { plugins: { reportMisbehavior: {} } },
	},
): Promise<Application> => {
	const app = getApplication(label, options);
	if (options.clearDB) {
		// Remove pre-existing data
		fs.removeSync(path.join(app.config.rootPath, label).replace('~', os.homedir()));
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
		const pluginInstance = getReportMisbehaviorPlugin(app);
		await pluginInstance['_pluginDB'].clear();
	}

	await app.shutdown();
};

export const getURL = (url: string, port = apiPort): string => `http://localhost:${port}${url}`;

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
	new Promise<void>(r =>
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

export const publishEvent = (app: Application, block: string): void => {
	const eventInfo = { event: 'postBlock', data: { block } };
	app['_channel'].publish('app:network:event', eventInfo);
};
