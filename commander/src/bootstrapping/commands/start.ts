/* eslint-disable no-param-reassign */
/*
 * Copyright © 2021 Lisk Foundation
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
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Command, Flags as flagParser } from '@oclif/core';
import * as fs from 'fs-extra';
import { utils as cryptoUtils } from '@liskhq/lisk-cryptography';
import { Types, Application } from 'lisk-framework';
import * as utils from '@liskhq/lisk-utils';
import { flagsWithParser } from '../../utils/flags';

import {
	getDefaultPath,
	getFullPath,
	getConfigDirs,
	ensureConfigDir,
	getNetworkConfigFilesPath,
	getConfigFilesPath,
} from '../../utils/path';

const LOG_OPTIONS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
export abstract class StartCommand extends Command {
	static description = 'Start Blockchain Node.';

	static examples = [
		'start',
		'start --network devnet --data-path /path/to/data-dir --log debug',
		'start --network devnet --api-ws',
		'start --network devnet --api-ws --api-port 8888',
		'start --network devnet --port 9000',
		'start --network devnet --port 9002 --seed-peers 127.0.0.1:9001,127.0.0.1:9000',
		'start --network testnet --overwrite-config',
		'start --network testnet --config ~/my_custom_config.json',
	];

	static flags = {
		'data-path': flagsWithParser.dataPath,
		network: flagsWithParser.network,
		config: flagsWithParser.config,
		'overwrite-config': flagParser.boolean({
			description: 'Overwrite network configs if they exist already',
			default: false,
		}),
		port: flagParser.integer({
			char: 'p',
			description:
				'Open port for the peer to peer incoming connections. Environment variable "LISK_PORT" can also be used.',
			env: 'LISK_PORT',
		}),
		'api-ipc': flagParser.boolean({
			description:
				'Enable IPC communication. This will load plugins as a child process and communicate over IPC. Environment variable "LISK_API_IPC" can also be used.',
			env: 'LISK_API_IPC',
			default: false,
		}),
		'api-ws': flagParser.boolean({
			description:
				'Enable websocket communication for api-client. Environment variable "LISK_API_WS" can also be used.',
			env: 'LISK_API_WS',
			default: false,
		}),
		'api-http': flagParser.boolean({
			description:
				'Enable HTTP communication for api-client. Environment variable "LISK_API_HTTP" can also be used.',
			env: 'LISK_API_HTTP',
			default: false,
		}),
		'api-port': flagParser.integer({
			description:
				'Port to be used for api-client. Environment variable "LISK_API_PORT" can also be used.',
			env: 'LISK_API_WS_PORT',
		}),
		'api-host': flagParser.string({
			description:
				'Host to be used for api-client. Environment variable "LISK_API_HOST" can also be used.',
			env: 'LISK_API_HOST',
		}),
		log: flagParser.string({
			char: 'l',
			description: 'Log level. Environment variable "LISK_LOG_LEVEL" can also be used.',
			env: 'LISK_LOG_LEVEL',
			options: LOG_OPTIONS,
		}),
		'seed-peers': flagParser.string({
			env: 'LISK_SEED_PEERS',
			description:
				'Seed peers to initially connect to in format of comma separated "ip:port". IP can be DNS name or IPV4 format. Environment variable "LISK_SEED_PEERS" can also be used.',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(this.constructor as typeof StartCommand);
		const dataPath = flags['data-path']
			? flags['data-path']
			: getDefaultPath(this.config.pjson.name);
		this.log(`Starting Lisk ${this.config.pjson.name} at ${getFullPath(dataPath)}.`);

		const defaultNetworkConfigDir = getConfigDirs(this.getApplicationConfigDir(), true);
		if (!defaultNetworkConfigDir.includes(flags.network)) {
			this.error(
				`Network ${
					flags.network
				} is not supported, supported networks: ${defaultNetworkConfigDir.join(',')}.`,
			);
		}

		// Read network genesis block and config from the folder
		const {
			basePath: destBasePath,
			configFilePath,
			genesisBlockFilePath,
		} = getConfigFilesPath(dataPath);
		const { basePath: srcBasePath, genesisBlockFilePath: srcGenesisBlockPath } =
			getNetworkConfigFilesPath(this.getApplicationConfigDir(), flags.network, true);

		// If genesis block file exist, do not copy unless overwrite-config is specified
		if (fs.existsSync(genesisBlockFilePath)) {
			if (
				!cryptoUtils
					.hash(fs.readFileSync(srcGenesisBlockPath))
					.equals(cryptoUtils.hash(fs.readFileSync(genesisBlockFilePath))) &&
				!flags['overwrite-config']
			) {
				this.error(
					`Datapath ${dataPath} already contains configs for ${flags.network}. Please use --overwrite-config to overwrite the config.`,
				);
			}
		}

		if (
			!fs.existsSync(destBasePath) ||
			(fs.existsSync(destBasePath) && flags['overwrite-config'])
		) {
			ensureConfigDir(dataPath);
			fs.copySync(srcBasePath, destBasePath, { overwrite: true });
		}

		// Get config from network config or config specified
		let config = await fs.readJSON(configFilePath);

		if (flags.config) {
			const customConfig: Types.ApplicationConfig = await fs.readJSON(flags.config);
			config = utils.objects.mergeDeep({}, config, customConfig) as Types.ApplicationConfig;
		}
		config.system.version = this.config.pjson.version;
		config.system.dataPath = dataPath;
		// Inject other properties specified
		const modes = [];
		if (flags['api-ipc']) {
			modes.push('ipc');
		}
		if (flags['api-ws']) {
			modes.push('ws');
		}
		if (flags['api-http']) {
			modes.push('http');
		}
		if (modes.length) {
			config.rpc = utils.objects.mergeDeep({}, config.rpc, {
				modes,
			});
		}
		if (flags['api-host']) {
			config.rpc = utils.objects.mergeDeep({}, config.rpc, {
				host: flags['api-host'],
			});
		}
		if (flags['api-port']) {
			config.rpc = utils.objects.mergeDeep({}, config.rpc, {
				port: flags['api-port'],
			});
		}
		if (flags.log) {
			config.system.logLevel = flags.log;
		}
		if (flags.port) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			config.network = config.network ?? {};
			config.network.port = flags.port;
		}
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (flags['seed-peers']) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			config.network = config.network ?? {};
			config.network.seedPeers = [];
			const peers = flags['seed-peers'].split(',');
			for (const seed of peers) {
				const [ip, port] = seed.split(':');
				if (!ip || !port || Number.isNaN(Number(port))) {
					this.error('Invalid seed-peers, ip or port is invalid or not specified.');
				}
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				config.network.seedPeers.push({ ip, port: Number(port) });
			}
		}

		// Get application and start
		try {
			const app = await this.getApplication(config);
			await app.run();
		} catch (errors) {
			this.error(
				Array.isArray(errors)
					? errors.map(err => (err as Error).message).join(',')
					: (errors as string),
			);
		}
	}

	abstract getApplication(config: Types.PartialApplicationConfig): Promise<Application>;

	abstract getApplicationConfigDir(): string;
}
