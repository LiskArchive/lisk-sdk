/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import lockfile from 'lockfile';
import path from 'path';
import * as defaultConfig from '../default_config.json';
import { CONFIG_VARIABLES } from './constants';
import { ValidationError } from './error';
import { readJSONSync, writeJSONSync } from './fs';

export type WritableValue =
	| string
	| ReadonlyArray<string>
	| boolean
	| number
	| object;

interface ConfigOptionsIndex {
	// tslint:disable-next-line readonly-keyword
	[key: string]: WritableValue;
}

interface ConfigObject {
	readonly api: {
		readonly network: string;
		readonly nodes: ReadonlyArray<string>;
	};
	readonly json: boolean;
	readonly pretty: boolean;
}

export type ConfigOptions = ConfigOptionsIndex & ConfigObject;

const configFileName = 'config.json';
const lockfileName = 'config.lock';

const fileWriteErrorMessage = (filePath: string): string =>
	`Could not write to \`${filePath}\`. Your configuration will not be persisted.`;

const attemptCallWithError = <T>(fn: () => T, errorMessage: string): T => {
	try {
		return fn();
	} catch (_) {
		throw new Error(errorMessage);
	}
};

const attemptToCreateDir = (dirPath: string): void => {
	const fn = fs.mkdirSync.bind(undefined, dirPath);
	attemptCallWithError<void>(fn, fileWriteErrorMessage(dirPath));
};

const attemptToCreateFile = (filePath: string): void => {
	const fn = writeJSONSync.bind(undefined, filePath, defaultConfig);
	attemptCallWithError<void>(fn, fileWriteErrorMessage(filePath));
};

const checkLockfile = (filePath: string): void => {
	const locked = lockfile.checkSync(filePath);
	const errorMessage = `Config lockfile at ${filePath} found. Are you running Lisk Commander in another process?`;
	if (locked) {
		throw new Error(errorMessage);
	}
};

const attemptToReadJSONFile = <T>(filePath: string): T => {
	const fn = readJSONSync.bind(undefined, filePath) as () => T;
	const errorMessage = `Config file cannot be read or is not valid JSON. Please check ${filePath} or delete the file so we can create a new one from defaults.`;

	return attemptCallWithError<T>(fn, errorMessage);
};

const attemptToValidateConfig = (config: object, filePath: string): void => {
	const rootKeys = CONFIG_VARIABLES.map(key => key.split('.')[0]);
	const fn = (): void => {
		rootKeys.forEach(key => {
			if (!Object.keys(config).includes(key)) {
				throw new ValidationError(`Key ${key} not found in config file.`);
			}
		});
	};
	const errorMessage = `Config file seems to be corrupted: missing required keys. Please check ${filePath} or delete the file so we can create a new one from defaults.`;

	attemptCallWithError<void>(fn, errorMessage);
};

export const setConfig = (
	configDirPath: string,
	newConfig: object,
): boolean => {
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

export const getConfig = (configDirPath: string): ConfigOptions => {
	if (!fs.existsSync(configDirPath)) {
		attemptToCreateDir(configDirPath);
	}

	const configFilePath = path.join(configDirPath, configFileName);

	if (!fs.existsSync(configFilePath)) {
		attemptToCreateFile(configFilePath);

		return defaultConfig;
	}

	const config = attemptToReadJSONFile<ConfigOptions>(configFilePath);
	attemptToValidateConfig(config, configFilePath);

	return config;
};
