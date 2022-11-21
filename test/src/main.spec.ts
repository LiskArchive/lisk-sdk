/*
 * Copyright © 2022 Lisk Foundation
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
 *
 */
import * as childProcess from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { apiClient } from 'lisk-sdk';
import * as debug from 'debug';
import { specs as tokenSpecs } from './scenarios/modules/token';
import * as passphrase from '../../examples/pos-mainchain/config/default/passphrase.json';
import * as validators from '../../examples/pos-mainchain/config/default/dev-validators.json';
import { block } from './utils';

// dataPath is defined globally to be able to access from all the tests
const dataPath = path.join(os.tmpdir(), Date.now().toString());

jest.setTimeout(100000000);

describe('Lisk SDK functional test', () => {
	const specs = [...tokenSpecs];
	const appLog = debug('application');

	let appProcess: ReturnType<typeof childProcess.spawn>;
	let client: apiClient.APIClient;

	beforeAll(async () => {
		const parameters = ['start', '-d', dataPath, '--api-ws', '--api-ipc', '--log', 'debug'];
		appProcess = childProcess.spawn('./bin/run', parameters, {
			cwd: path.join(__dirname, '../../examples/pos-mainchain'),
			env: {
				...process.env,
				// setting production will run the command with node.js version
				NODE_ENV: 'production',
			},
		});
		appProcess.stdout?.on('data', (data: Buffer) => {
			appLog(data.toString());
		});
		appProcess.stderr?.on('data', (data: Buffer) => {
			appLog(data.toString());
		});
		// Wait for 5s to start the process
		await new Promise(resolve => setTimeout(resolve, 5000));
		client = await apiClient.createIPCClient(dataPath);
		await block.waitForBlock(client, 2);
	});

	afterAll(async () => {
		await client.disconnect();
		process.kill(appProcess.pid, 'SIGTERM');
	});

	describe('all functional tests', () => {
		for (const spec of specs) {
			spec({ dataPath, passphrase, validators });
		}
	});
});
