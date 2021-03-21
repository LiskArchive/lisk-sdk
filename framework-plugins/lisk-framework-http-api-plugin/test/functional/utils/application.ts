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
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, rmdirSync } from 'fs-extra';
import {
	KeysModule,
	PartialApplicationConfig,
	SequenceModule,
	testing,
	TokenModule,
	DPoSModule,
} from 'lisk-framework';

import { HTTPAPIPlugin } from '../../../src';

export const createApplicationEnv = (
	label: string,
	consoleLogLevel?: string,
): testing.ApplicationEnv => {
	const rootPath = '~/.lisk/http-plugin';
	const config = {
		...testing.fixtures.defaultConfig,
		rootPath,
		label,
		logger: {
			consoleLogLevel: consoleLogLevel ?? 'fatal',
			fileLogLevel: 'fatal',
			logFileName: 'lisk.log',
		},
		network: {
			...testing.fixtures.defaultConfig.network,
			maxInboundConnections: 0,
		},
		forging: {
			...testing.fixtures.defaultConfig.forging,
			force: true,
		},
		rpc: {
			enable: true,
			port: 8080,
			mode: 'ipc',
		},
	} as PartialApplicationConfig;

	const dataPath = join(rootPath.replace('~', homedir()), label);
	if (existsSync(dataPath)) {
		rmdirSync(dataPath, { recursive: true });
	}

	const modules = [TokenModule, SequenceModule, KeysModule, DPoSModule];
	const defaultFaucetAccount = {
		address: testing.fixtures.defaultFaucetAccount.address,
		token: { balance: BigInt(testing.fixtures.defaultFaucetAccount.balance) },
		dpos: {
			delegate: {
				username: 'faucet_delegate',
			},
		},
	};
	const accounts = testing.fixtures.defaultAccounts().map((a, i) =>
		testing.fixtures.createDefaultAccount(modules, {
			address: a.address,
			dpos: {
				delegate: {
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					username: `delegate_${i}`,
				},
			},
		}),
	);
	const { genesisBlockJSON } = testing.createGenesisBlock({
		modules,
		accounts: [defaultFaucetAccount, ...accounts],
	});

	const appEnv = new testing.ApplicationEnv({
		modules,
		config,
		genesisBlockJSON,
		plugins: [HTTPAPIPlugin],
	});

	return appEnv;
};

export const closeApplicationEnv = async (
	appEnv: testing.ApplicationEnv,
	options: { clearDB: boolean } = { clearDB: true },
): Promise<void> => {
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
