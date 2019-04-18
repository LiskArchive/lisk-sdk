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
import Listr from 'listr';
import semver from 'semver';
import BaseCommand from '../../base';
import { RELEASE_URL } from '../../utils/constants';
import { downloadLiskAndValidate, extract } from '../../utils/download';
import { flags as commonFlags } from '../../utils/flags';
import { isCacheRunning, startCache, stopCache } from '../../utils/node/cache';
import {
	backupLisk,
	getVersionToUpgrade,
	liskTar,
	upgradeLisk,
	validateVersion,
} from '../../utils/node/commons';
import { getConfig } from '../../utils/node/config';
import { startDatabase, stopDatabase } from '../../utils/node/database';
import {
	describeApplication,
	Pm2Env,
	registerApplication,
	restartApplication,
	unRegisterApplication,
} from '../../utils/node/pm2';

interface Flags {
	readonly 'lisk-version': string;
}

interface Args {
	readonly name: string;
}

interface PackageJson {
	readonly version: string;
}

export default class UpgradeCommand extends BaseCommand {
	static args = [
		{
			name: 'name',
			description: 'Lisk Core installation directory name.',
			required: true,
		},
	];

	static description = 'Upgrade an instance of Lisk Core to a specified or latest version.';

	static examples = [
		'node:upgrade mainnet-latest',
		'node:upgrade --lisk-version=2.0.0 mainnet-latest',
	];

	static flags = {
		...BaseCommand.flags,
		'lisk-version': flagParser.string({
			...commonFlags.liskVersion,
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
				task: async () => {
					await validateVersion(network, upgradeVersion);
					if (semver.lte(upgradeVersion, currentVersion)) {
						throw new Error(
							`Upgrade version:${upgradeVersion} should be greater than current version: ${currentVersion}`,
						);
					}
				},
			},
			{
				title: 'Stop and Unregister Lisk Core',
				task: async () => {
					const isRunning = await isCacheRunning(installDir, network);
					if (isRunning) {
						await stopCache(installDir, network);
					}
					await stopDatabase(installDir, network);
					await unRegisterApplication(name);
				},
			},
			{
				title: 'Download, Backup and Install Lisk Core',
				task: () =>
					new Listr([
						{
							title: `Download Lisk Core: ${upgradeVersion} Release`,
							task: async () => {
								await downloadLiskAndValidate(
									cacheDir,
									releaseUrl,
									upgradeVersion,
								);
							},
						},
						{
							title: `Backup Lisk Core: ${currentVersion} installed as ${name}`,
							task: async () => {
								await backupLisk(installDir);
							},
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
				task: async () => {
					await upgradeLisk(installDir, name, network, currentVersion);
				},
			},
			{
				title: `Start Lisk Core: ${upgradeVersion}`,
				task: async () => {
					await registerApplication(installDir, network, name);
					const isRunning = await isCacheRunning(installDir, network);
					if (!isRunning) {
						await startCache(installDir, network);
					}
					await startDatabase(installDir, network);
					await restartApplication(name);
				},
			},
		]);

		await tasks.run();
	}
}
