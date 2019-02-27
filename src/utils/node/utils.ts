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
import * as fsExtra from 'fs-extra';
import * as os from 'os';
import { NETWORK, OS } from '../constants';

export const liskInstall = (installPath: string): string =>
	installPath.replace('~', os.homedir);

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

export const osSupported = (): boolean => os.type() in OS;

export const networkSupported = (network: NETWORK): void => {
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

export const isValidURL = (url: string): void => {
	const isValid = new RegExp(/^(ftp|http|https):\/\/[^ "]+$/);

	if (isValid.test(url)) {
		return;
	}

	throw new Error(`Invalid URL: ${url}`);
};
