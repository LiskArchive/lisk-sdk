/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import * as fs from 'fs';

export interface CacheConfig {
	readonly host: string;
	readonly password: string | null;
	readonly port: number;
}

export interface DbConfig {
	readonly database: string;
	readonly host: string;
	readonly password: boolean;
	readonly port: number;
	readonly user: string;
}

export interface NodeConfig {
	readonly cacheEnabled: boolean;
	readonly db: DbConfig;
	readonly redis: CacheConfig;
}

export const configPath = (network: string = 'default'): string =>
	`config/${network}/config.json`;

export const getConfig = (filePath: string): object => {
	if (!fs.existsSync(filePath)) {
		throw new Error(`Config file not exists in path: ${filePath}`);
	}
	const config = fs.readFileSync(filePath, 'utf8');

	return JSON.parse(config);
};

const getDefaultConfig = (installDir: string): NodeConfig => {
	const defaultConfigPath = `${installDir}/${configPath()}`;
	const defaultConfig = getConfig(defaultConfigPath) as NodeConfig;

	return defaultConfig;
};

const getNetworkConfig = (installDir: string, network: string): NodeConfig => {
	const networkConfigPath = `${installDir}/${configPath(network)}`;
	const networkConfig = getConfig(networkConfigPath) as NodeConfig;

	return networkConfig;
};

export const getDbConfig = (installDir: string, network: string): DbConfig => {
	const defaultConfig: NodeConfig = getDefaultConfig(installDir);
	const networkConfig = getNetworkConfig(installDir, network);

	return { ...defaultConfig.db, ...networkConfig.db };
};

export const getCacheConfig = (
	installDir: string,
	network: string,
): CacheConfig => {
	const defaultConfig: NodeConfig = getDefaultConfig(installDir);
	const networkConfig = getNetworkConfig(installDir, network);

	return { ...defaultConfig.redis, ...networkConfig.redis };
};

export const isCacheEnabled = (
	installDir: string,
	network: string,
): boolean => {
	const defaultConfig: NodeConfig = getDefaultConfig(installDir);
	const networkConfig = getNetworkConfig(installDir, network);

	if (
		networkConfig.cacheEnabled &&
		typeof networkConfig.cacheEnabled === 'boolean'
	) {
		return networkConfig.cacheEnabled;
	}

	return defaultConfig.cacheEnabled;
};
