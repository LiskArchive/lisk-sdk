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
import Axios from 'axios';
import * as fsExtra from 'fs-extra';
import Listr from 'listr';
import semver from 'semver';
import BaseCommand from '../../base';
import { NETWORK, RELEASE_URL } from '../../utils/constants';
import { downloadLiskAndValidate, extract } from '../../utils/download';
import { flags as commonFlags } from '../../utils/flags';
import { liskTar } from '../../utils/node/commons';
import { defaultBackupPath, getConfig } from '../../utils/node/config';
import {
	describeApplication,
	Pm2Env,
	registerApplication,
	unRegisterApplication,
} from '../../utils/node/pm2';
import { getLatestVersion } from '../../utils/node/release';
import { exec, ExecResult } from '../../utils/worker-process';
import StartCommand from './start';
import StopCommand from './stop';

interface Flags {
	readonly name: string;
	readonly version: string;
}

interface PackageJson {
	readonly version: string;
}

const getVersionToUpgrade = async (version: string, network: string) => {
	if (!version) {
		const url = `${RELEASE_URL}/${network}/latest.txt`;
		const latestVersion = await getLatestVersion(url);

		return latestVersion;
	}

	return version;
};

const validateVersion = async (
	network: string,
	currentVersion: string,
	toVersion: string,
): Promise<void> => {
	if (!semver.valid(toVersion)) {
		throw new Error(
			`Upgrade version: ${toVersion} has invalid format, Please refer version from release url: ${RELEASE_URL}/${network}`,
		);
	}

	if (semver.lte(toVersion, currentVersion)) {
		throw new Error(
			`Upgrade version:${toVersion} should be greater than current version: ${currentVersion}`,
		);
	}

	const url = `${RELEASE_URL}/${network}/${toVersion}`;
	try {
		await Axios.get(url);
	} catch (error) {
		if (error.message === 'Request failed with status code 404') {
			throw new Error(
				`Upgrade version: ${toVersion} doesn't exists in ${RELEASE_URL}/${network}`,
			);
		}
		throw new Error(error.message);
	}
};

const backupLisk = async (installDir: string): Promise<void> => {
	fsExtra.emptyDirSync(defaultBackupPath);
	const { stderr }: ExecResult = await exec(
		`mv -f ${installDir} ${defaultBackupPath}`,
	);
	if (stderr) {
		throw new Error(stderr);
	}
};

const upgradeLisk = async (
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
};

export default class UpgradeCommand extends BaseCommand {
	static description = 'Upgrade locally installed Lisk Core instance to specified or latest version';

	static examples = [
		'node:upgrade --name=mainnet_1.6',
		'node:upgrade --name=mainnet_1.6 --version=1.7.1',
		'node:upgrade --network=testnet --name=testnet_1.6',
		'node:upgrade --network=testnet --name=testnet_1.6 --version=1.6.1',
	];

	static flags = {
		...BaseCommand.flags,
		name: flagParser.string({
			...commonFlags.name,
			default: NETWORK.MAINNET,
		}),
		version: flagParser.string({
			...commonFlags.version,
		}),
	};

	async run(): Promise<void> {
		const { flags } = this.parse(UpgradeCommand);
		const { name, version } = flags as Flags;
		const { pm2_env } = await describeApplication(name);
		const { pm_cwd: installDir, LISK_NETWORK: network } = pm2_env as Pm2Env;
		const { version: currentVersion } = getConfig(
			`${installDir}/package.json`,
		) as PackageJson;
		const upgradeVersion: string = await getVersionToUpgrade(version, network);
		const releaseUrl = `${RELEASE_URL}/${network}/${upgradeVersion}`;
		const { cacheDir } = this.config;

		const tasks = new Listr([
			{
				title: 'Validate Version',
				task: async () =>
					validateVersion(network, currentVersion, upgradeVersion),
			},
			{
				title: 'Stop and Unregister Lisk Services',
				task: () =>
					new Listr([
						{
							title: 'Stop Lisk Services',
							task: async () =>
								StopCommand.run(['--network', network, '--name', name]),
						},
						{
							title: `Unregister Lisk Core: ${name} from PM2`,
							task: async () => unRegisterApplication(name),
						},
					]),
			},
			{
				title: 'Download, Backup and Install Lisk Core',
				task: () =>
					new Listr([
						{
							title: `Download Lisk Core: ${upgradeVersion} Release`,
							task: async () =>
								downloadLiskAndValidate(cacheDir, releaseUrl, upgradeVersion),
						},
						{
							title: `Backup Lisk Core: ${currentVersion} installed as ${name}`,
							task: async () => backupLisk(installDir),
						},
						{
							title: `Install Lisk Core: ${upgradeVersion}`,
							task: async () => {
								fsExtra.ensureDirSync(installDir);
								await extract(cacheDir, liskTar(upgradeVersion), installDir);
							},
						},
					]),
			},
			{
				title: `Upgrade Lisk Core from: ${currentVersion} to: ${upgradeVersion}`,
				task: async () =>
					upgradeLisk(installDir, name, network, currentVersion),
			},
			{
				title: `Start Lisk Core: ${upgradeVersion}`,
				task: async () => {
					await registerApplication(installDir, network, name);
					await StartCommand.run(['--network', network, '--name', name]);
				},
			},
		]);

		await tasks.run();
	}
}
