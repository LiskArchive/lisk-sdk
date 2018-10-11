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
import fs from 'fs';
import path from 'path';
import lockfile from 'lockfile';
import defaultConfig from '../../default_config.json';
import { CONFIG_VARIABLES } from './constants';
import { ValidationError } from './error';
import { readJSONSync, writeJSONSync } from './fs';

const configFileName = 'config.json';
const lockfileName = 'config.lock';

const fileWriteErrorMessage = filePath =>
	`Could not write to \`${filePath}\`. Your configuration will not be persisted.`;

const attemptCallWithError = (fn, errorMessage) => {
	try {
		return fn();
	} catch (_) {
		throw new Error(errorMessage);
	}
};

const attemptToCreateDir = dirPath => {
	const fn = fs.mkdirSync.bind(null, dirPath);
	return attemptCallWithError(fn, fileWriteErrorMessage(dirPath));
};

const attemptToCreateFile = filePath => {
	const fn = writeJSONSync.bind(null, filePath, defaultConfig);
	return attemptCallWithError(fn, fileWriteErrorMessage(filePath));
};

const checkLockfile = filePath => {
	const locked = lockfile.checkSync(filePath);
	const errorMessage = `Config lockfile at ${filePath} found. Are you running Lisk Commander in another process?`;
	if (locked) {
		throw new Error(errorMessage);
	}
};

const attemptToReadJSONFile = filePath => {
	const fn = readJSONSync.bind(null, filePath);
	const errorMessage = `Config file cannot be read or is not valid JSON. Please check ${filePath} or delete the file so we can create a new one from defaults.`;
	return attemptCallWithError(fn, errorMessage);
};

const attemptToValidateConfig = (config, filePath) => {
	const rootKeys = CONFIG_VARIABLES.map(key => key.split('.')[0]);
	const fn = () =>
		rootKeys.forEach(key => {
			if (!Object.keys(config).includes(key)) {
				throw new ValidationError(`Key ${key} not found in config file.`);
			}
		});
	const errorMessage = `Config file seems to be corrupted: missing required keys. Please check ${filePath} or delete the file so we can create a new one from defaults.`;
	return attemptCallWithError(fn, errorMessage);
};

export const setConfig = (configDirPath, newConfig) => {
	const lockFilePath = path.join(configDirPath, lockfileName);
	const configFilePath = path.join(configDirPath, configFileName);

	checkLockfile(lockFilePath);
	lockfile.lockSync(lockFilePath);
	try {
		writeJSONSync(configFilePath, newConfig);
		return true;
	} catch (e) {
		return false;
	} finally {
		lockfile.unlockSync(lockFilePath);
	}
};

export const getConfig = configDirPath => {
	if (!fs.existsSync(configDirPath)) {
		attemptToCreateDir(configDirPath);
	}

	const configFilePath = path.join(configDirPath, configFileName);

	if (!fs.existsSync(configFilePath)) {
		attemptToCreateFile(configFilePath);
		return defaultConfig;
	}

	const config = attemptToReadJSONFile(configFilePath);
	attemptToValidateConfig(config, configFilePath);

	return config;
};
