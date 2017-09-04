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
import fse from 'fs-extra';
import defaultConfig from '../../defaultConfig.json';

const configDirName = '.lisky';
const configFileName = 'config.json';
const homedir = os.homedir();
const configDirPath = `${homedir}/${configDirName}`;
const configFilePath = `${configDirPath}/${configFileName}`;

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
	const fn = fse.mkdirSync.bind(null, path);
	return attemptCallWithWarning(fn, path);
};

const attemptToCreateFile = (path) => {
	const fn = fse.writeJsonSync.bind(null, path, defaultConfig, {
		spaces: '\t',
	});
	return attemptCallWithWarning(fn, path);
};

const checkReadAccess = (path) => {
	const fn = fse.accessSync.bind(null, path, fse.constants.R_OK);
	const error = `Could not read config file. Please check permissions for ${path} or delete the file so we can create a new one from defaults.`;
	return attemptCallWithError(fn, 1, error);
};

const attemptToReadJsonFile = (path) => {
	const fn = fse.readJsonSync.bind(null, path);
	const error = `Config file is not valid JSON. Please check ${path} or delete the file so we can create a new one from defaults.`;
	return attemptCallWithError(fn, 2, error);
};

const getConfig = () => {
	if (!fse.existsSync(configDirPath)) {
		attemptToCreateDir(configDirPath);
	}

	if (!fse.existsSync(configFilePath)) {
		attemptToCreateFile(configFilePath);
		return defaultConfig;
	}

	checkReadAccess(configFilePath);

	return attemptToReadJsonFile(configFilePath);
};

export default getConfig();
