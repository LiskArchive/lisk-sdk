/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
import os from 'os';
import fs from 'fs';
import lockfile from 'lockfile';
import defaultConfig from '../../defaultConfig.json';
import { readJSONSync, writeJSONSync } from './fs';
import { logWarning, logError } from './print';

const configDirName = '.lisky';
const configFileName = 'config.json';
const lockfileName = 'config.lock';
const homedir = os.homedir();
const configDirPath =
	process.env.LISKY_CONFIG_DIR || `${homedir}/${configDirName}`;
export const configFilePath = `${configDirPath}/${configFileName}`;
const lockfilePath = `${configDirPath}/${lockfileName}`;

const attemptCallWithWarning = (fn, path) => {
	try {
		return fn();
	} catch (_) {
		const warning = `WARNING: Could not write to \`${path}\`. Your configuration will not be persisted.`;
		return logWarning(warning);
	}
};

const attemptCallWithError = (fn, errorCode, errorMessage) => {
	try {
		return fn();
	} catch (_) {
		logError(errorMessage);
		return process.exit(errorCode);
	}
};

const attemptToCreateDir = path => {
	const fn = fs.mkdirSync.bind(null, path);
	return attemptCallWithWarning(fn, path);
};

const attemptToCreateFile = path => {
	const fn = writeJSONSync.bind(null, path, defaultConfig);
	return attemptCallWithWarning(fn, path);
};

const checkReadAccess = path => {
	const fn = fs.accessSync.bind(null, path, fs.constants.R_OK);
	const errorCode = 1;
	const errorMessage = `Could not read config file. Please check permissions for ${path} or delete the file so we can create a new one from defaults.`;
	return attemptCallWithError(fn, errorCode, errorMessage);
};

const checkLockfile = path => {
	const fn = lockfile.lockSync.bind(null, path);
	const errorCode = 3;
	const errorMessage = `Config lockfile at ${lockfilePath} found. Are you running Lisky in another process?`;
	return attemptCallWithError(fn, errorCode, errorMessage);
};

const attemptToReadJSONFile = path => {
	const fn = readJSONSync.bind(null, path);
	const errorCode = 2;
	const errorMessage = `Config file is not valid JSON. Please check ${path} or delete the file so we can create a new one from defaults.`;
	return attemptCallWithError(fn, errorCode, errorMessage);
};

const getConfig = () => {
	if (!fs.existsSync(configDirPath)) {
		attemptToCreateDir(configDirPath);
	}

	if (!fs.existsSync(configFilePath)) {
		attemptToCreateFile(configFilePath);
		return defaultConfig;
	}

	if (!process.env.EXEC_FILE_CHILD) {
		checkLockfile(lockfilePath);
	}

	checkReadAccess(configFilePath);

	return attemptToReadJSONFile(configFilePath);
};

export default getConfig();
