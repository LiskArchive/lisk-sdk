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
import { Application, ApplicationConfig, GenesisBlockJSON } from 'lisk-framework';
import * as genesisBlockJSON from '../fixtures/genesis_block.json';
import * as configJSON from '../fixtures/config.json';
import { ForgerPlugin } from '../../src';
import { HTTPAPIPlugin } from '../../../lisk-framework-http-api-plugin/dist-node/http_api_plugin';

const httpApiPort = 5000;
const forgerApiPort = 5001;

export const createApplication = async (
	label: string,
	consoleLogLevel?: string,
): Promise<Application> => {
	const rootPath = '~/.lisk/forger-plugin';
	const config = ({
		...configJSON,
		rootPath,
		label,
		logger: {
			consoleLogLevel: consoleLogLevel ?? 'fatal',
			fileLogLevel: 'fatal',
		},
		network: {
			maxInboundConnections: 0,
		},
		plugins: {
			httpApi: {
				port: httpApiPort,
			},
			forger: {
				port: forgerApiPort,
			},
		},
	} as unknown) as Partial<ApplicationConfig>;

	const app = new Application(genesisBlockJSON as GenesisBlockJSON, config);
	app.registerPlugin(HTTPAPIPlugin);
	app.registerPlugin(ForgerPlugin, { loadAsChildProcess: false });

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
	const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];
	await forgerPluginInstance['_forgerPluginDB'].clear();
	await app.shutdown();
};

export const getURL = (url: string, port = httpApiPort): string => `http://localhost:${port}${url}`;

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
