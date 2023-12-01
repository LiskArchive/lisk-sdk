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
 */
import * as fs from 'fs';
import { Engine } from './engine';
import { ABIClient } from './abi_handler/abi_client';
import { createLogger } from './logger';
import { EngineConfig } from './types';
import { StateMachine } from './state_machine';

const socketPath: string = process.argv[2];
const configIndex = process.argv.findIndex(arg => arg === '--config' || arg === '-c');
if (configIndex < 0) {
	throw new Error(`Engine config is required. config must be specified with --config or -c.`);
}
const configPath = process.argv[configIndex + 1];

if (!configPath) {
	throw new Error('Config path is required.');
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as EngineConfig;

const abiLogger = createLogger({
	logLevel: config.system.logLevel,
	name: 'ABIClient',
});

let started = false;
const client = new ABIClient(abiLogger, socketPath);
const engine = new Engine(client, config, new StateMachine());
client
	.start()
	.then(async () => {
		await engine.start();
		started = true;
	})
	.catch(err => {
		abiLogger.error({ err: err as Error }, 'Fail to start engine');
		process.exit(1);
	});

// A rare case, if master process is disconnecting IPC then unload the plugin
process.on('disconnect', () => {
	if (!started) {
		return;
	}
	engine
		.stop()
		.then(() => {
			client.stop();
		})
		.catch(err => {
			abiLogger.error({ err: err as Error }, 'Error occured while stopping the engine');
			process.exit(1);
		});
});

process.once('SIGINT', () => {
	// Do nothing and gave time to master process to cleanup properly
});

process.once('SIGTERM', () => {
	// Do nothing and gave time to master process to cleanup properly
});
