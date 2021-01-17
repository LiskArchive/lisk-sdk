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
 *
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { PartialApplicationConfig, systemDirs } from 'lisk-sdk';

const defaultDir = '.lisk';
const defaultFolder = 'lisk-core';
const getConfigPath = (dataPath: string): string => path.join(dataPath, 'config');

export const getDefaultPath = (): string => path.join(os.homedir(), defaultDir, defaultFolder);

export const getFullPath = (dataPath: string): string => path.resolve(dataPath);

export const splitPath = (dataPath: string): { rootPath: string; label: string } => {
	const rootPath = path.resolve(path.join(dataPath, '../'));
	const label = path.parse(dataPath).name;
	return {
		rootPath,
		label,
	};
};

export const getDefaultConfigDir = (): string => path.join(__dirname, '../..');

export const getNetworkConfigFilesPath = (
	dataPath: string,
	network: string,
): { genesisBlockFilePath: string; configFilePath: string } => {
	const basePath = path.join(dataPath, 'config', network);
	return {
		genesisBlockFilePath: path.join(basePath, 'genesis_block.json'),
		configFilePath: path.join(basePath, 'config.json'),
	};
};

export const getDefaultNetworkConfigFilesPath = (
	network: string,
): { genesisBlockFilePath: string; configFilePath: string } => {
	const basePath = path.join(getDefaultConfigDir(), 'config', network);
	return {
		genesisBlockFilePath: path.join(basePath, 'genesis_block.json'),
		configFilePath: path.join(basePath, 'config.json'),
	};
};

export const getConfigDirs = (dataPath: string): string[] => {
	const configPath = getConfigPath(dataPath);
	fs.ensureDirSync(configPath);
	const files = fs.readdirSync(configPath);
	return files.filter(file => fs.statSync(path.join(configPath, file)).isDirectory());
};

export const getGenesisBlockAndConfig = async (
	network: string,
): Promise<{
	genesisBlock: Record<string, unknown>;
	config: PartialApplicationConfig;
}> => {
	const {
		genesisBlockFilePath: defaultGenesisBlockFilePath,
		configFilePath: defaultConfigFilepath,
	} = getDefaultNetworkConfigFilesPath(network);

	// Get config from network config or config specified
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const genesisBlock: Record<string, unknown> = await fs.readJSON(defaultGenesisBlockFilePath);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const config: PartialApplicationConfig = await fs.readJSON(defaultConfigFilepath);

	return { genesisBlock, config };
};

export const removeConfigDir = (dataPath: string, network: string): void =>
	fs.removeSync(path.join(dataPath, 'config', network));

export const ensureConfigDir = (dataPath: string, network: string): void =>
	fs.ensureDirSync(path.join(dataPath, 'config', network));

export const getBlockchainDBPath = (dataPath: string): string =>
	path.join(dataPath, 'data', 'blockchain.db');

export const getForgerDBPath = (dataPath: string): string =>
	path.join(dataPath, 'data', 'forger.db');

export const getPidPath = (dataPath: string): string =>
	path.join(dataPath, 'tmp', 'pids', 'controller.pid');

export interface SocketPaths {
	readonly pub: string;
	readonly sub: string;
	readonly rpc: string;
	readonly root: string;
}

export const getSocketsPath = (dataPath: string, network = defaultFolder): SocketPaths => {
	const dirs = systemDirs(network, dataPath);
	return {
		root: `unix://${dirs.sockets}`,
		pub: `unix://${dirs.sockets}/lisk_pub.sock`,
		sub: `unix://${dirs.sockets}/lisk_sub.sock`,
		rpc: `unix://${dirs.sockets}/bus_rpc_socket.sock`,
	};
};
