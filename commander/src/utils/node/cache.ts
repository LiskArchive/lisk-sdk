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
import { NETWORK, REDIS_PORTS } from '../constants';
import { exec, ExecResult } from '../worker-process';
import { CacheConfig, getCacheConfig } from './config';

const CACHE_START_SUCCESS = '[+] Redis-Server started successfully.';
const CACHE_START_FAILURE = '[-] Failed to start Redis-Server.';
const CACHE_STOP_SUCCESS = '[+] Redis-Server stopped successfully.';
const CACHE_STOP_FAILURE = '[-] Failed to stop Redis-Server.';

const REDIS_CONFIG = 'etc/redis.conf';
const REDIS_BIN = 'bin/redis-server';
const REDIS_CLI = 'bin/redis-cli';

export const isCacheRunning = async (
	installDir: string,
	network: NETWORK,
): Promise<boolean> => {
	try {
		const redisPort: number = REDIS_PORTS[network];
		const { stdout }: ExecResult = await exec(
			`cd ${installDir}; ${REDIS_CLI} -p ${redisPort} ping`,
		);

		return stdout.search('PONG') >= 0;
	} catch (error) {
		return false;
	}
};

export const startCache = async (
	installDir: string,
	network: NETWORK,
): Promise<string> => {
	const redisPort: number = REDIS_PORTS[network];
	const { stdout, stderr }: ExecResult = await exec(
		`cd ${installDir}; ${REDIS_BIN} ${REDIS_CONFIG} --port ${redisPort}`,
	);

	if (stdout.trim() === '') {
		return CACHE_START_SUCCESS;
	}

	throw new Error(`${CACHE_START_FAILURE}: \n\n ${stderr}`);
};

const stopCommand = (installDir: string, network: NETWORK): string => {
	const { password }: CacheConfig = getCacheConfig(installDir, network);
	const redisPort: number = REDIS_PORTS[network];

	if (password) {
		return `${REDIS_CLI} -p ${redisPort} -a ${password} shutdown`;
	}

	return `${REDIS_CLI} -p ${redisPort} shutdown`;
};

export const stopCache = async (
	installDir: string,
	network: NETWORK,
): Promise<string> => {
	const { stdout, stderr }: ExecResult = await exec(
		`cd ${installDir}; ${stopCommand(installDir, network)}`,
	);

	if (stdout.trim() === '') {
		return CACHE_STOP_SUCCESS;
	}

	throw new Error(`${CACHE_STOP_FAILURE}: \n\n ${stderr}`);
};
