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
import Axios from 'axios';
import * as fsExtra from 'fs-extra';
import * as os from 'os';
import semver from 'semver';
import { NETWORK, OS, RELEASE_URL } from '../constants';
import { exec, ExecResult } from '../worker-process';
import { defaultBackupPath } from './config';
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

export const liskSnapshotUrl = (url: string, network: NETWORK) =>
	`${url}/${network}/blockchain.db.gz`;

export const liskDbSnapshot = (networkName: string, network: NETWORK) =>
	`${networkName}-${network}-blockchain.db.gz`;

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

export const getVersionToUpgrade = async (
	network: string,
	version?: string,
) => {
	if (!version) {
		const url = `${RELEASE_URL}/${network}/latest.txt`;
		const latestVersion = await getLatestVersion(url);

		return latestVersion;
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
	network: string,
	currentVersion: string,
): Promise<void> => {
	const LISK_BACKUP = `${defaultBackupPath}/${name}`;
	const LISK_OLD_PG = `${LISK_BACKUP}/pgsql/data`;
	const LISK_PG = `${installDir}/pgsql/data/`;
	const MODE = 0o700;

	fsExtra.mkdirSync(LISK_PG, MODE);

	const { stderr }: ExecResult = await exec(
		`cp -rf ${LISK_OLD_PG}/ ${LISK_PG}/;
    ${installDir}/bin/node ${installDir}/scripts/update_config.js --network ${network} --output ${installDir}/config.json ${LISK_BACKUP}/config.json ${currentVersion}`,
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
		await Axios.get(url);
	} catch (error) {
		if (error.message === 'Request failed with status code 404') {
			throw new Error(
				`Upgrade version: ${version} doesn't exists in ${RELEASE_URL}/${network}`,
			);
		}
		throw new Error(error.message);
	}
};
