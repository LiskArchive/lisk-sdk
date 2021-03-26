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
	Application,
	KeysModule,
	PartialApplicationConfig,
	SequenceModule,
	testing,
	TokenModule,
} from 'lisk-framework';
import { ReportMisbehaviorPlugin } from '../../src';

const apiPort = 5002;

export const getReportMisbehaviorPlugin = (app: Application): ReportMisbehaviorPlugin => {
	return app['_controller']['_inMemoryPlugins'][ReportMisbehaviorPlugin.alias]['plugin'];
};

export const createApplicationEnv = (
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
): testing.ApplicationEnv => {
	const rootPath = '~/.lisk/report-misbehavior-plugin';
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
			reportMisbehavior: {
				port: apiPort,
				encryptedPassphrase: testing.fixtures.defaultFaucetAccount.encryptedPassphrase,
			},
		},
	} as PartialApplicationConfig;

	const appEnv = new testing.ApplicationEnv({
		modules: [TokenModule, SequenceModule, KeysModule],
		plugins: [ReportMisbehaviorPlugin],
		config,
	});
	// FIXME: Remove with #5572
	// validator.removeSchema('/block/header');

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
