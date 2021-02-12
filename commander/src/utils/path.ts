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

import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { PartialApplicationConfig } from 'lisk-framework';

const defaultDir = '.lisk';
const getConfigPath = (dataPath: string): string => path.join(dataPath, 'config');

export const getDefaultPath = (name: string): string => path.join(os.homedir(), defaultDir, name);

export const getFullPath = (dataPath: string): string => path.resolve(dataPath);

export const splitPath = (dataPath: string): { rootPath: string; label: string } => {
	const rootPath = path.resolve(path.join(dataPath, '../'));
	const label = path.parse(dataPath).name;
	return {
		rootPath,
		label,
	};
};

export const getDefaultConfigDir = (): string => process.cwd();

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
