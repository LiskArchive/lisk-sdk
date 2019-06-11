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
import { NETWORK } from '../constants';
import { exec, ExecResult } from '../worker-process';
import { getLiskConfig, LiskConfig } from './config';
import { describeApplication, PM2ProcessInstance } from './pm2';

const CACHE_START_SUCCESS = '[+] Redis-Server started successfully.';
const CACHE_START_FAILURE = '[-] Failed to start Redis-Server.';
const CACHE_STOP_SUCCESS = '[+] Redis-Server stopped successfully.';
const CACHE_STOP_FAILURE = '[-] Failed to stop Redis-Server.';

const REDIS_CONFIG = 'etc/redis.conf';
const REDIS_BIN = './bin/redis-server';
const REDIS_CLI = './bin/redis-cli';

export const isCacheRunning = async (
	installDir: string,
	name: string,
): Promise<boolean> => {
	const { redisPort } = (await describeApplication(name)) as PM2ProcessInstance;

	const { stderr }: ExecResult = await exec(
		`${REDIS_CLI} -p ${redisPort} ping`,
		{ cwd: installDir },
	);

	return !stderr;
};

export const startCache = async (
	installDir: string,
	name: string,
): Promise<string> => {
	const { redisPort } = (await describeApplication(name)) as PM2ProcessInstance;

	const { stderr }: ExecResult = await exec(
		`${REDIS_BIN} ${REDIS_CONFIG} --port ${redisPort}`,
		{ cwd: installDir },
	);

	if (!stderr) {
		return CACHE_START_SUCCESS;
	}

	throw new Error(`${CACHE_START_FAILURE}: \n\n ${stderr}`);
};

const stopCommand = async (
	installDir: string,
	network: NETWORK,
	name: string,
): Promise<string> => {
	try {
		const {
			components: {
				cache: { password },
			},
		}: LiskConfig = await getLiskConfig(installDir, network);
		const { redisPort } = (await describeApplication(
			name,
		)) as PM2ProcessInstance;

		if (password) {
			return `${REDIS_CLI} -p ${redisPort} -a ${password} shutdown`;
		}

		return `${REDIS_CLI} -p ${redisPort} shutdown`;
	} catch (error) {
		throw new Error(error);
	}
};

export const stopCache = async (
	installDir: string,
	network: NETWORK,
	name: string,
): Promise<string> => {
	try {
		const cmd = await stopCommand(installDir, network, name);

		const { stderr }: ExecResult = await exec(cmd, { cwd: installDir });

		if (!stderr) {
			return CACHE_STOP_SUCCESS;
		}

		throw new Error(`${CACHE_STOP_FAILURE}: \n\n ${stderr}`);
	} catch (error) {
		throw new Error(error);
	}
};

export const isCacheEnabled = async (
	installDir: string,
	network: NETWORK,
): Promise<boolean> => {
	try {
		const {
			components: {
				cache: { enabled },
			},
		}: LiskConfig = await getLiskConfig(installDir, network);

		return enabled;
	} catch (error) {
		throw new Error(error);
	}
};
