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
import { PartialApplicationConfig } from 'lisk-framework';
import * as configJSON from '../fixtures/config.json';

const rootPath = '~/.lisk/http-plugin';

export const config = {
	...configJSON,
	rootPath,
	logger: {
		consoleLogLevel: 'fatal',
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
