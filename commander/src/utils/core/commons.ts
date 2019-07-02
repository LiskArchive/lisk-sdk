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
import fsExtra from 'fs-extra';
import * as os from 'os';
import semver from 'semver';
import {
	HTTP_PORTS,
	NETWORK,
	OS,
	POSTGRES_PORT,
	REDIS_PORT,
	RELEASE_URL,
	SNAPSHOT_URL,
	WS_PORTS,
} from '../constants';
import { exec, ExecResult } from '../worker-process';
import { defaultBackupPath } from './config';
import {
	listApplication,
	PM2ProcessInstance,
	ReadableInstanceType,
} from './pm2';
import { getLatestVersion } from './release';

export const liskInstall = (installPath: string): string =>
	installPath.replace('~', os.homedir);

export const installDirectory = (installPath: string, name: string): string =>
	`${liskInstall(installPath)}/${name}`;

export const liskVersion = (version: string): string =>
	`lisk-${version}-${os.type()}-x86_64`;

export const liskTar = (version: string): string =>
	`${liskVersion(version)}.tar.gz`;

export const liskTarSHA256 = (version: string): string =>
	`${liskTar(version)}.SHA256`;

export const liskLatestUrl = (url: string, network: NETWORK) =>
	`${url}/${network}/latest.txt`;

export const liskSnapshotUrl = (url: string, network: NETWORK): string => {
	if (
		!['testnet', 'mainnet'].includes(network.toLowerCase()) &&
		url === SNAPSHOT_URL
	) {
		return '';
	}

	if (url && url.search(RELEASE_URL) >= 0 && url.search('db.gz') >= 0) {
		return `${RELEASE_URL}/${network}/blockchain.db.gz`;
	}

	return url;
};

export const logsDir = (installPath: string) =>
	`${liskInstall(installPath)}/logs`;

export const SH_LOG_FILE = 'logs/lisk.out';

export const validateNotARootUser = (): void => {
	if (process.getuid && process.getuid() === 0) {
		throw new Error('Error: Lisk should not be run be as root. Exiting.');
	}
};

export const isSupportedOS = (): boolean => os.type() in OS;

export const validateNetwork = (network: NETWORK): void => {
	if (network.toUpperCase() in NETWORK) {
		return;
	}

	throw new Error(
		`Network "${network}" is not supported, please try options ${Object.values(
			NETWORK,
		).join(',')}`,
	);
};

export const createDirectory = (dirPath: string): void => {
	const resolvedPath = liskInstall(dirPath);
	if (!fsExtra.pathExistsSync(resolvedPath)) {
		// TODO: Remove fs-extra and use fs.mkdirsSync(path, { recursive: true})
		fsExtra.ensureDirSync(resolvedPath);
	}
};

export const validURL = (url: string): void => {
	const isValid = new RegExp(/^(ftp|http|https):\/\/[^ "]+$/);

	if (isValid.test(url)) {
		return;
	}

	throw new Error(`Invalid URL: ${url}`);
};

export const getSemver = (str: string): string => {
	const exp = new RegExp(
		/(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:[1-9]\d*|[\da-z-]*[a-z-][\da-z-]*)(?:\.(?:[1-9]\d*|[\da-z-]*[a-z-][\da-z-]*))*)?\.?(?:0|[1-9]\d*)?/,
	);
	const result = exp.exec(str) as ReadonlyArray<string>;

	return result[0];
};

export const getVersionToInstall = async (
	network: NETWORK,
	version?: string,
	releaseUrl?: string,
) => {
	if (!version) {
		if (releaseUrl) {
			return getSemver(releaseUrl);
		} else {
			const url = `${RELEASE_URL}/${network}/latest.txt`;
			const latestVersion = await getLatestVersion(url);

			return latestVersion;
		}
	}

	return version;
};

export const backupLisk = async (installDir: string): Promise<void> => {
	fsExtra.emptyDirSync(defaultBackupPath);
	const { stderr }: ExecResult = await exec(
		`mv -f ${installDir} ${defaultBackupPath}`,
	);
	if (stderr) {
		throw new Error(stderr);
	}
};

export const upgradeLisk = async (
	installDir: string,
	name: string,
	network: NETWORK,
	currentVersion: string,
): Promise<void> => {
	const LISK_BACKUP = `${defaultBackupPath}/${name}`;
	const LISK_OLD_PG = `${LISK_BACKUP}/pgsql/data`;
	const LISK_PG = `${installDir}/pgsql/data`;
	const MODE = 0o700;

	fsExtra.mkdirSync(LISK_PG, MODE);
	fsExtra.copySync(LISK_OLD_PG, LISK_PG);

	// TODO: Use latest 2.0.0 config utils to get config insted of scripts/update_config.js
	const { stderr }: ExecResult = await exec(
		`${installDir}/bin/node ${installDir}/scripts/update_config.js --network ${network} --output ${installDir}/config.json ${LISK_BACKUP}/config.json ${currentVersion}`,
	);
	if (stderr) {
		throw new Error(stderr);
	}

	fsExtra.emptyDirSync(defaultBackupPath);
};

export const validateVersion = async (
	network: NETWORK,
	version: string,
): Promise<void> => {
	if (!semver.valid(version)) {
		throw new Error(
			`Upgrade version: ${version} has invalid format, Please refer version from release url: ${RELEASE_URL}/${network}`,
		);
	}

	const url = `${RELEASE_URL}/${network}/${version}`;
	try {
		await getLatestVersion(url);
	} catch (error) {
		if (error.message === 'Request failed with status code 404') {
			throw new Error(
				`Upgrade version: ${version} doesn't exists in ${RELEASE_URL}/${network}`,
			);
		}
		throw new Error(error.message);
	}
};

export const dateDiff = (date1: Date, date2: Date): number => {
	const MINUTES_OR_SECONDS = 60;
	const HOURS = 24;
	const INT_RANGE = 1000;

	return (
		(new Date(date1).valueOf() - new Date(date2).valueOf()) /
		(HOURS * MINUTES_OR_SECONDS * MINUTES_OR_SECONDS * INT_RANGE)
	);
};

interface FileInfo {
	readonly fileName: string;
	readonly fileDir: string;
	readonly filePath: string;
}

export const getDownloadedFileInfo = (
	url: string,
	cacheDir: string,
): FileInfo => {
	const pathWithoutProtocol = url.replace(/(^\w+:|^)\/\//, '').split('/');
	const fileName = pathWithoutProtocol.pop() as string;
	const fileDir = `${cacheDir}/${pathWithoutProtocol.join('/')}`;
	const filePath = `${fileDir}/${fileName}`;

	return {
		fileName,
		fileDir,
		filePath,
	};
};

const convertToNumber = (val: ReadableInstanceType): number => {
	if (!val) {
		return 0;
	}

	if (typeof val === 'number') {
		return val;
	}

	return parseInt(val, 10);
};

const getEnvByKey = (
	instances: ReadonlyArray<PM2ProcessInstance>,
	key: string,
	defaultValue: number,
): number => {
	const maxValue = instances
		.map(app => app[key])
		.reduce((acc, curr) => {
			const ac = convertToNumber(acc);
			const cu = convertToNumber(curr);

			return Math.max(ac, cu);
		}, defaultValue);

	return convertToNumber(maxValue) || defaultValue;
};

export const generateEnvConfig = async (network: NETWORK): Promise<object> => {
	const INCREMENT = 2;
	const instances = await listApplication();
	const filteredByNetwork = instances.filter(i => i.network === network);

	return {
		LISK_DB_PORT: getEnvByKey(instances, 'dbPort', POSTGRES_PORT) + 1,
		LISK_REDIS_PORT: getEnvByKey(instances, 'redisPort', REDIS_PORT) + 1,
		LISK_HTTP_PORT:
			getEnvByKey(filteredByNetwork, 'httpPort', HTTP_PORTS[network]) +
			INCREMENT,
		LISK_WS_PORT:
			getEnvByKey(filteredByNetwork, 'wsPort', WS_PORTS[network]) + INCREMENT,
	};
};
