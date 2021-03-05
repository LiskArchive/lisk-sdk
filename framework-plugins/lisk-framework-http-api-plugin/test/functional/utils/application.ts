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
import {
	KeysModule,
	PartialApplicationConfig,
	SequenceModule,
	testing,
	TokenModule,
} from 'lisk-framework';
import * as genesisBlockJSON from '../fixtures/genesis_block.json';
import * as configJSON from '../fixtures/config.json';
import { HTTPAPIPlugin } from '../../../src';

export const createApplicationEnv = (
	label: string,
	consoleLogLevel?: string,
): testing.ApplicationEnv => {
	const rootPath = '~/.lisk/http-plugin';
	const config = {
		...configJSON,
		rootPath,
		label,
		logger: {
			consoleLogLevel: consoleLogLevel ?? 'fatal',
			fileLogLevel: 'fatal',
			logFileName: 'lisk.log',
		},
		network: {
			...configJSON.network,
			maxInboundConnections: 0,
		},
		rpc: {
			enable: true,
			port: 8080,
			mode: 'ipc',
		},
	} as PartialApplicationConfig;

	const appEnv = new testing.ApplicationEnv({
		modules: [TokenModule, SequenceModule, KeysModule],
		config,
		plugins: [HTTPAPIPlugin],
		genesisBlock: genesisBlockJSON,
	});

	return appEnv;
};

export const closeApplicationEnv = async (
	appEnv: testing.ApplicationEnv,
	options: { clearDB: boolean } = { clearDB: true },
) => {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
	await appEnv.stopApplication(options);
};

export const getURL = (url: string, port = 4000): string => `http://localhost:${port}${url}`;

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
