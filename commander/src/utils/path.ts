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

const defaultDir = '.lisk';
const getConfigPath = (dataPath: string): string => path.join(dataPath, 'config');

export const getDefaultPath = (name: string): string => path.join(os.homedir(), defaultDir, name);

export const getFullPath = (dataPath: string): string => path.resolve(dataPath);

export const getConfigFilesPath = (
	dataPath: string,
	configDirIncluded = false,
): { basePath: string; genesisBlockFilePath: string; configFilePath: string } => {
	const basePath = configDirIncluded ? path.join(dataPath) : path.join(dataPath, 'config');
	return {
		basePath,
		genesisBlockFilePath: path.join(basePath, 'genesis_block.blob'),
		configFilePath: path.join(basePath, 'config.json'),
	};
};

export const getNetworkConfigFilesPath = (
	dataPath: string,
	network: string,
	configDirIncluded = false,
): { basePath: string; genesisBlockFilePath: string; configFilePath: string } => {
	const basePath = configDirIncluded
		? path.join(dataPath, network)
		: path.join(dataPath, 'config', network);
	return {
		basePath,
		genesisBlockFilePath: path.join(basePath, 'genesis_block.blob'),
		configFilePath: path.join(basePath, 'config.json'),
	};
};

export const getConfigDirs = (dataPath: string, configDirIncluded = false): string[] => {
	const configPath = configDirIncluded ? dataPath : getConfigPath(dataPath);
	fs.ensureDirSync(configPath);
	const files = fs.readdirSync(configPath);
	return files.filter(file => fs.statSync(path.join(configPath, file)).isDirectory());
};
export const ensureConfigDir = (dataPath: string): void =>
	fs.ensureDirSync(path.join(dataPath, 'config'));

export const getBlockchainDBPath = (dataPath: string): string =>
	path.join(dataPath, 'data', 'blockchain.db');

export const getStateDBPath = (dataPath: string): string => path.join(dataPath, 'data', 'state.db');

export const getModuleDBPath = (dataPath: string): string =>
	path.join(dataPath, 'data', 'module.db');

export const getForgerDBPath = (dataPath: string): string =>
	path.join(dataPath, 'data', 'forger.db');

export const getPidPath = (dataPath: string): string =>
	path.join(dataPath, 'tmp', 'pids', 'controller.pid');
