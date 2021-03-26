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
	Application,
	KeysModule,
	PartialApplicationConfig,
	SequenceModule,
	testing,
	TokenModule,
	DPoSModule,
} from 'lisk-framework';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';

import { ForgerPlugin } from '../../src';
import { getForgerInfo as getForgerInfoFromDB } from '../../src/db';
import { ForgerInfo } from '../../src/types';

const forgerApiPort = 5001;

export const getForgerPlugin = (app: Application): ForgerPlugin => {
	return app['_controller']['_inMemoryPlugins'][ForgerPlugin.alias]['plugin'];
};

export const createApplicationEnv = (
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
): testing.ApplicationEnv => {
	const rootPath = '~/.lisk/forger-plugin';
	const config = {
		...testing.fixtures.defaultConfig,
		rootPath,
		label,
		logger: {
			consoleLogLevel: options.consoleLogLevel ?? 'fatal',
			fileLogLevel: 'fatal',
			logFileName: 'lisk.log',
		},
		plugins: {
			forger: {
				port: forgerApiPort,
				...options.appConfig?.plugins.forger,
			},
		},
	} as PartialApplicationConfig;

	const dataPath = join(homedir(), rootPath, label);
	if (existsSync(dataPath)) {
		rmdirSync(dataPath, { recursive: true });
	}
	const modules = [TokenModule, SequenceModule, KeysModule, DPoSModule];

	const defaultFaucetAccount = {
		address: testing.fixtures.defaultFaucetAccount.address,
		token: { balance: BigInt(testing.fixtures.defaultFaucetAccount.balance) },
		dpos: {
			delegate: {
				username: 'delegate_1',
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
		plugins: [ForgerPlugin],
		genesisBlockJSON,
	});
	validator.removeSchema('/block/header');

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

export const waitTill = async (ms: number): Promise<void> =>
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
	const forgerAddress = getAddressFromPublicKey(Buffer.from(generatorPublicKey, 'hex')).toString(
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
