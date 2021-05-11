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
import { Command, flags as flagParser } from '@oclif/command';
import * as fs from 'fs-extra';
import { ApplicationConfig, Application, PartialApplicationConfig } from 'lisk-framework';
import * as utils from '@liskhq/lisk-utils';
import { flagsWithParser } from '../../utils/flags';

import {
	getDefaultPath,
	splitPath,
	getFullPath,
	getConfigDirs,
	removeConfigDir,
	ensureConfigDir,
	getNetworkConfigFilesPath,
} from '../../utils/path';

const LOG_OPTIONS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
export abstract class StartCommand extends Command {
	static description = 'Start Blockchain Node.';

	static examples = [
		'start',
		'start --network devnet --data-path /path/to/data-dir --log debug',
		'start --network devnet --api-ws',
		'start --network devnet --api-ws --api-ws-port 8888',
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
			exclusive: ['api-ws'],
		}),
		'api-ws': flagParser.boolean({
			description:
				'Enable websocket communication for api-client. Environment variable "LISK_API_WS" can also be used.',
			env: 'LISK_API_WS',
			default: false,
			exclusive: ['api-ipc'],
		}),
		'api-ws-port': flagParser.integer({
			description:
				'Port to be used for api-client websocket. Environment variable "LISK_API_WS_PORT" can also be used.',
			env: 'LISK_API_WS_PORT',
			dependsOn: ['api-ws'],
		}),
		'console-log': flagParser.string({
			description:
				'Console log level. Environment variable "LISK_CONSOLE_LOG_LEVEL" can also be used.',
			env: 'LISK_CONSOLE_LOG_LEVEL',
			options: LOG_OPTIONS,
		}),
		log: flagParser.string({
			char: 'l',
			description: 'File log level. Environment variable "LISK_FILE_LOG_LEVEL" can also be used.',
			env: 'LISK_FILE_LOG_LEVEL',
			options: LOG_OPTIONS,
		}),
		'seed-peers': flagParser.string({
			env: 'LISK_SEED_PEERS',
			description:
				'Seed peers to initially connect to in format of comma separated "ip:port". IP can be DNS name or IPV4 format. Environment variable "LISK_SEED_PEERS" can also be used.',
		}),
	};

	async run(): Promise<void> {
		const { flags } = this.parse(this.constructor as typeof StartCommand);
		const dataPath = flags['data-path']
			? flags['data-path']
			: getDefaultPath(this.config.pjson.name);
		this.log(`Starting Lisk ${this.config.pjson.name} at ${getFullPath(dataPath)}.`);
		const pathConfig = splitPath(dataPath);

		const defaultNetworkConfigDir = getConfigDirs(this.getApplicationConfigDir(), true);
		if (!defaultNetworkConfigDir.includes(flags.network)) {
			this.error(
				`Network ${
					flags.network
				} is not supported, supported networks: ${defaultNetworkConfigDir.join(',')}.`,
			);
		}

		// Validate dataPath/config if config for other network exists, throw error and exit unless overwrite-config is specified
		const configDir = getConfigDirs(dataPath);
		// If config file exist, do not copy unless overwrite-config is specified
		if (configDir.length > 1 || (configDir.length === 1 && configDir[0] !== flags.network)) {
			if (!flags['overwrite-config']) {
				this.error(
					`Datapath ${dataPath} already contains configs for ${configDir.join(
						',',
					)}. Please use --overwrite-config to overwrite the config.`,
				);
			}
			// Remove other network configs
			for (const configFolder of configDir) {
				if (configFolder !== flags.network) {
					removeConfigDir(dataPath, configFolder);
				}
			}
		}
		// If genesis block file exist, do not copy unless overwrite-config is specified
		ensureConfigDir(dataPath, flags.network);

		// Read network genesis block and config from the folder
		const { genesisBlockFilePath, configFilePath } = getNetworkConfigFilesPath(
			dataPath,
			flags.network,
		);
		const {
			genesisBlockFilePath: defaultGenesisBlockFilePath,
			configFilePath: defaultConfigFilepath,
		} = getNetworkConfigFilesPath(this.getApplicationConfigDir(), flags.network, true);

		if (
			!fs.existsSync(genesisBlockFilePath) ||
			(fs.existsSync(genesisBlockFilePath) && flags['overwrite-config'])
		) {
			fs.copyFileSync(defaultGenesisBlockFilePath, genesisBlockFilePath);
		}
		if (
			!fs.existsSync(configFilePath) ||
			(fs.existsSync(configFilePath) && flags['overwrite-config'])
		) {
			fs.copyFileSync(defaultConfigFilepath, configFilePath);
		}

		// Get config from network config or config specified
		const genesisBlock = await fs.readJSON(genesisBlockFilePath);
		let config = await fs.readJSON(configFilePath);

		if (flags.config) {
			const customConfig: ApplicationConfig = await fs.readJSON(flags.config);
			config = utils.objects.mergeDeep({}, config, customConfig) as ApplicationConfig;
		}

		config.rootPath = pathConfig.rootPath;
		config.label = pathConfig.label;
		config.version = this.config.pjson.version;
		// Inject other properties specified
		if (flags['api-ipc']) {
			config.rpc = utils.objects.mergeDeep({}, config.rpc, {
				enable: flags['api-ipc'],
				mode: 'ipc',
			});
		}
		if (flags['api-ws']) {
			config.rpc = utils.objects.mergeDeep({}, config.rpc, {
				enable: flags['api-ws'],
				mode: 'ws',
				port: flags['api-ws-port'],
			});
		}
		if (flags['console-log']) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			config.logger = config.logger ?? {};
			config.logger.consoleLogLevel = flags['console-log'];
		}
		if (flags.log) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			config.logger = config.logger ?? {};
			config.logger.fileLogLevel = flags.log;
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
			const app = this.getApplication(genesisBlock, config);
			await app.run();
		} catch (errors) {
			this.error(
				Array.isArray(errors) ? errors.map(err => (err as Error).message).join(',') : errors,
			);
		}
	}

	abstract getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application;

	abstract getApplicationConfigDir(): string;
}
