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
import {
	readJsonSync,
	writeJsonSync,
} from '../utils/fs';

const configDirName = '.lisky';
const configFileName = 'config.json';
const lockfileName = 'config.lock';
const homedir = os.homedir();
const configDirPath = process.env.LISKY_CONFIG_DIR || `${homedir}/${configDirName}`;
export const configFilePath = `${configDirPath}/${configFileName}`;
const lockfilePath = `${configDirPath}/${lockfileName}`;

const attemptCallWithWarning = (fn, path) => {
	try {
		return fn();
	} catch (_) {
		const warning = `WARNING: Could not write to \`${path}\`. Your configuration will not be persisted.`;
		console.warn(warning);
		return null;
	}
};

const attemptCallWithError = (fn, code, error) => {
	try {
		return fn();
	} catch (_) {
		console.error(error);
		return process.exit(code);
	}
};

const attemptToCreateDir = (path) => {
	const fn = fs.mkdirSync.bind(null, path);
	return attemptCallWithWarning(fn, path);
};

const attemptToCreateFile = (path) => {
	const fn = writeJsonSync.bind(null, path, defaultConfig);
	return attemptCallWithWarning(fn, path);
};

const checkReadAccess = (path) => {
	const fn = fs.accessSync.bind(null, path, fs.constants.R_OK);
	const error = `Could not read config file. Please check permissions for ${path} or delete the file so we can create a new one from defaults.`;
	return attemptCallWithError(fn, 1, error);
};

const checkLockfile = (path) => {
	const fn = lockfile.lockSync.bind(null, path);
	const error = `Config lockfile at ${lockfilePath} found. Are you running Lisky in another process?`;
	return attemptCallWithError(fn, 3, error);
};

const attemptToReadJsonFile = (path) => {
	const fn = readJsonSync.bind(null, path);
	const error = `Config file is not valid JSON. Please check ${path} or delete the file so we can create a new one from defaults.`;
	return attemptCallWithError(fn, 2, error);
};

const getConfig = () => {
	if (!fs.existsSync(configDirPath)) {
		attemptToCreateDir(configDirPath);
	}

	if (!fs.existsSync(configFilePath)) {
		attemptToCreateFile(configFilePath);
		return defaultConfig;
	}

	checkLockfile(lockfilePath);
	checkReadAccess(configFilePath);

	return attemptToReadJsonFile(configFilePath);
};

export default getConfig();
