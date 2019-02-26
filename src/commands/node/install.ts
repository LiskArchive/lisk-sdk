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

import { flags as flagParser } from '@oclif/command';
import * as fsExtra from 'fs-extra';
import * as os from 'os';
import BaseCommand from '../../base';
import { NETWORK } from '../../utils/constants';
import { download, extract, validateChecksum } from '../../utils/download';
import { getReleaseInfo } from '../../utils/node/release';
import {
	createDirectory,
	isValidURL,
	LISK_DB_SNAPSHOT,
	LISK_LATEST_URL,
	LISK_SNAPSHOT_URL,
	liskInstall,
	liskTar,
	liskTarSHA256,
	networkSupported,
	osSupported,
	validateNotARootUser,
} from '../../utils/node/utils';

interface Flags {
	readonly installationPath: string;
	readonly name: string;
	readonly network: NETWORK;
	readonly 'no-snapshot': boolean;
	readonly releaseUrl: string;
	readonly snapshotUrl: string;
}

interface Options {
	readonly installDir: string;
	readonly liskTarSHA256Url: string;
	readonly liskTarUrl: string;
	readonly version: string;
}

const validatePrerequisite = (installPath: string): void => {
	if (!osSupported()) {
		throw new Error(`Lisk install is not supported on ${os.type()}`);
	}
	if (fsExtra.pathExistsSync(installPath)) {
		throw new Error(`Installation already exists in path ${installPath}`);
	}
};

const validateOptions = ({ network, releaseUrl, snapshotUrl }: Flags): void => {
	networkSupported(network);
	isValidURL(releaseUrl);
	isValidURL(snapshotUrl);
};

const buildOptions = async ({
	installationPath,
	name,
	network,
	releaseUrl,
}: Flags): Promise<Options> => {
	const installPath = liskInstall(installationPath);
	const installDir = `${installPath}/${name}/`;
	const latestURL = LISK_LATEST_URL(releaseUrl, network);
	const { version, liskTarUrl, liskTarSHA256Url } = await getReleaseInfo(
		latestURL,
		releaseUrl,
		network,
	);

	return {
		installDir,
		version,
		liskTarUrl,
		liskTarSHA256Url,
	};
};

const installLisk = async (options: Flags, cacheDir: string): Promise<void> => {
	const {
		installDir,
		liskTarUrl,
		liskTarSHA256Url,
		version,
	} = await buildOptions(options);
	const { name, network, snapshotUrl, 'no-snapshot': noSnapshot } = options;
	const LISK_RELEASE_PATH = `${cacheDir}/${liskTar(version)}`;
	const LISK_RELEASE_SHA256_PATH = `${cacheDir}/${liskTarSHA256(version)}`;

	validatePrerequisite(installDir);

	await download(liskTarUrl, LISK_RELEASE_PATH);
	await download(liskTarSHA256Url, LISK_RELEASE_SHA256_PATH);
	await validateChecksum(cacheDir, liskTarSHA256(version));

	if (!noSnapshot) {
		const snapshotPath = `${cacheDir}/${LISK_DB_SNAPSHOT(name, network)}`;
		const snapshotURL = LISK_SNAPSHOT_URL(snapshotUrl, network);
		await download(snapshotURL, snapshotPath);
	}

	createDirectory(installDir);
	await extract(cacheDir, liskTar(version), installDir);
};

const INSTALL_PATH = '~/.lisk/network';
const RELEASE_URL = 'https://downloads.lisk.io/lisk';
const SNAPSHOT_URL = 'http://snapshots.lisk.io.s3-eu-west-1.amazonaws.com/lisk';

export default class InstallCommand extends BaseCommand {
	static description = `Install lisk software`;

	static examples = [
		'node:install',
		'node:install --installation-path=/opt/lisk/lisk-testnet --network=testnet',
		'node:install --no-snapshot',
	];

	static flags = {
		...BaseCommand.flags,
		network: flagParser.string({
			char: 'n',
			description: 'Name of the network to install(mainnet, testnet, betanet).',
			default: NETWORK.MAINNET,
		}),
		installationPath: flagParser.string({
			char: 'p',
			description: 'Path of Lisk Core to install.',
			default: INSTALL_PATH,
		}),
		name: flagParser.string({
			description: 'Name of the directory to install Lisk Core.',
			default: NETWORK.MAINNET,
		}),
		releaseUrl: flagParser.string({
			char: 'r',
			description: 'URL of the repository to download the Lisk Core.',
			default: RELEASE_URL,
		}),
		snapshotUrl: flagParser.string({
			char: 's',
			description: 'URL of the Lisk Core blockchain snapshot.',
			default: SNAPSHOT_URL,
		}),
		'no-snapshot': flagParser.boolean({
			description: 'Install Lisk Core without blockchain snapshot',
			default: false,
			allowNo: false,
		}),
	};

	async run(): Promise<void> {
		const { flags } = this.parse(InstallCommand);
		const options = flags as Flags;
		const cacheDir = this.config.cacheDir;

		validateNotARootUser();
		validateOptions(options);
		await installLisk(options, cacheDir);
		this.print({ status: `Installed lisk network: ${options.network}` });
	}
}
