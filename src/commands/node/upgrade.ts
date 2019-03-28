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
import { RELEASE_URL } from '../../utils/constants';
import { downloadLiskAndValidate, extract } from '../../utils/download';
import { flags as commonFlags } from '../../utils/flags';
import {
	backupLisk,
	getVersionToUpgrade,
	liskTar,
	upgradeLisk,
} from '../../utils/node/commons';
import { getConfig } from '../../utils/node/config';
import {
	describeApplication,
	Pm2Env,
	registerApplication,
	unRegisterApplication,
} from '../../utils/node/pm2';
import StartCommand from './start';
import StopCommand from './stop';

interface Flags {
	readonly 'lisk-version': string;
}

interface Args {
	readonly name: string;
}

interface PackageJson {
	readonly version: string;
}

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

export default class UpgradeCommand extends BaseCommand {
	static args = [
		{
			name: 'name',
			description: 'Lisk installation directory name.',
			required: true,
		},
	];

	static description = 'Upgrade locally installed Lisk instance to specified or latest version';

	static examples = ['node:upgrade --lisk-version=2.0.0 mainnet_1.6'];

	static flags = {
		...BaseCommand.flags,
		'lisk-version': flagParser.string({
			...commonFlags.version,
		}),
	};

	async run(): Promise<void> {
		const { args, flags } = this.parse(UpgradeCommand);
		const { name }: Args = args;
		const { 'lisk-version': liskVersion } = flags as Flags;
		const { pm2_env } = await describeApplication(name);
		const { pm_cwd: installDir, LISK_NETWORK: network } = pm2_env as Pm2Env;
		const { version: currentVersion } = getConfig(
			`${installDir}/package.json`,
		) as PackageJson;
		const upgradeVersion: string = await getVersionToUpgrade(
			network,
			liskVersion,
		);
		const releaseUrl = `${RELEASE_URL}/${network}/${upgradeVersion}`;
		const { cacheDir } = this.config;

		const tasks = new Listr([
			{
				title: 'Validate Version Input',
				task: async () =>
					validateVersion(network, currentVersion, upgradeVersion),
			},
			{
				title: 'Stop and Unregister Lisk',
				task: () =>
					new Listr([
						{
							title: 'Stop Lisk',
							task: async () => StopCommand.run([name]),
						},
						{
							title: `Unregister Lisk: ${name} from PM2`,
							task: async () => unRegisterApplication(name),
						},
					]),
			},
			{
				title: 'Download, Backup and Install Lisk',
				task: () =>
					new Listr([
						{
							title: `Download Lisk: ${upgradeVersion} Release`,
							task: async () =>
								downloadLiskAndValidate(cacheDir, releaseUrl, upgradeVersion),
						},
						{
							title: `Backup Lisk: ${currentVersion} installed as ${name}`,
							task: async () => backupLisk(installDir),
						},
						{
							title: `Install Lisk: ${upgradeVersion}`,
							task: async () => {
								fsExtra.ensureDirSync(installDir);
								await extract(cacheDir, liskTar(upgradeVersion), installDir);
							},
						},
					]),
			},
			{
				title: `Upgrade Lisk from: ${currentVersion} to: ${upgradeVersion}`,
				task: async () =>
					upgradeLisk(installDir, name, network, currentVersion),
			},
			{
				title: `Start Lisk: ${upgradeVersion}`,
				task: async () => {
					await registerApplication(installDir, network, name);
					await StartCommand.run([name]);
				},
			},
		]);

		await tasks.run();
	}
}
