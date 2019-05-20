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
import * as os from 'os';
import * as path from 'path';
import { NETWORK } from '../constants';
import { exec } from '../worker-process';

interface AppConfig {
	readonly version: string;
	readonly minVersion: string;
	readonly protocolVersion: string;
}

interface StorageConfig {
	readonly database: string;
	readonly user: string;
	readonly password: string;
}

interface CacheConfig {
	readonly password: string;
	readonly enabled: boolean;
}

interface ComponentsConfig {
	readonly storage: StorageConfig;
	readonly cache: CacheConfig;
}

export interface LiskConfig {
	readonly app: AppConfig;
	readonly components: ComponentsConfig;
}

export const defaultLiskPath = path.join(os.homedir(), '.lisk');
export const defaultLiskPm2Path = `${defaultLiskPath}/pm2`;
export const defaultLiskInstancePath = `${defaultLiskPath}/instances`;
export const defaultBackupPath = `${defaultLiskInstancePath}/backup`;
const NODE_BIN = './bin/node';

export const getLiskConfig = async (
	installDir: string,
	network: NETWORK,
): Promise<LiskConfig> => {
	const cmd = `${NODE_BIN} scripts/generate_config.js -n ${network} | head -n 10000`;
	const kb = 1024;
	const size = 400;
	const maxBuffer = kb * size;

	const { stdout, stderr } = await exec(cmd, { cwd: installDir, maxBuffer });
	if (stderr) {
		throw new Error(stderr);
	}

	return JSON.parse(stdout) as LiskConfig;
};
