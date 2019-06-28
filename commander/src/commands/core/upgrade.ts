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
import * as tar from 'tar';
import BaseCommand from '../../base';
import { isCacheRunning, startCache, stopCache } from '../../utils/core/cache';
import {
	backupLisk,
	generateEnvConfig,
	getDownloadedFileInfo,
	getVersionToInstall,
	upgradeLisk,
	validateVersion,
} from '../../utils/core/commons';
import { startDatabase, stopDatabase } from '../../utils/core/database';
import {
	describeApplication,
	PM2ProcessInstance,
	registerApplication,
	restartApplication,
	stopApplication,
	unRegisterApplication,
} from '../../utils/core/pm2';
import { getReleaseInfo } from '../../utils/core/release';
import { downloadAndValidate } from '../../utils/download';
import { flags as commonFlags } from '../../utils/flags';

interface Flags {
	readonly 'lisk-version': string;
	readonly 'release-url': string;
}

interface Args {
	readonly name: string;
}

export default class UpgradeCommand extends BaseCommand {
	static args = [
		{
			name: 'name',
			description: 'Lisk Core installation directory name.',
			required: true,
		},
	];

	static description =
		'Upgrade an instance of Lisk Core to a specified or latest version.';

	static examples = [
		'core:upgrade lisk-mainnet',
		'core:upgrade --lisk-version=2.0.0 lisk-mainnet',
		'core:upgrade --release-url=https://lisk-releases.ams3.digitaloceanspaces.com/lisk-core/lisk-1.6.0-rc.4-Linux-x86_64.tar.gz lisk-mainnet',
	];

	static flags = {
		json: flagParser.boolean({
			...BaseCommand.flags.json,
			hidden: true,
		}),
		pretty: flagParser.boolean({
			...BaseCommand.flags.pretty,
			hidden: true,
		}),
		'lisk-version': flagParser.string({
			...commonFlags.liskVersion,
		}),
		'release-url': flagParser.string({
			...commonFlags.releaseUrl,
		}),
	};

	async run(): Promise<void> {
		const { args, flags } = this.parse(UpgradeCommand);
		const { name }: Args = args;
		const {
			'lisk-version': liskVersion,
			'release-url': releaseUrl,
		} = flags as Flags;
		const instance = await describeApplication(name);

		if (!instance) {
			this.log(
				`Lisk Core instance: ${name} doesn't exists.\nTo upgrade first install using lisk core:install and then run lisk core:upgrade`,
			);

			return;
		}

		const {
			installationPath,
			network,
			version: currentVersion,
		} = instance as PM2ProcessInstance;

		const upgradeVersion: string = await getVersionToInstall(
			network,
			liskVersion,
			releaseUrl,
		);
		const { cacheDir } = this.config;
		// TODO: Commander not creating cache directory
		// This is a patch to handle the scenario
		fsExtra.ensureDirSync(cacheDir);
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
				title: `Download Lisk Core: ${upgradeVersion} for upgrade`,
				task: async () => {
					const { liskTarUrl } = await getReleaseInfo(
						releaseUrl,
						network,
						upgradeVersion,
					);
					await downloadAndValidate(liskTarUrl, cacheDir);
				},
			},
			{
				title: 'Stop, Backup and Install Lisk Core',
				task: () =>
					new Listr([
						{
							title: `Stop Lisk Core`,
							task: async () => {
								const isRunning = await isCacheRunning(installationPath, name);
								if (isRunning) {
									await stopCache(installationPath, network, name);
								}
								await stopDatabase(installationPath, name);
								await stopApplication(name);
							},
						},
						{
							title: `Backup Lisk Core: ${currentVersion} installed as ${name}`,
							task: async () => {
								await backupLisk(installationPath);
							},
						},
						{
							title: `Install Lisk Core: ${upgradeVersion}`,
							task: async () => {
								fsExtra.ensureDirSync(installationPath);
								const { liskTarUrl } = await getReleaseInfo(
									releaseUrl,
									network,
									upgradeVersion,
								);
								const { fileDir, fileName } = getDownloadedFileInfo(
									liskTarUrl,
									cacheDir,
								);

								await tar.x({
									file: `${fileDir}/${fileName}`,
									cwd: installationPath,
									strip: 1,
								});
							},
						},
					]),
			},
			{
				title: `Upgrade Lisk Core ${name} instance from: ${currentVersion} to: ${upgradeVersion}`,
				task: async () => {
					await upgradeLisk(installationPath, name, network, currentVersion);
				},
			},
			{
				title: 'Unregister and register Lisk Core',
				task: async () => {
					const envConfig = await generateEnvConfig(network);

					await unRegisterApplication(name);
					await registerApplication(installationPath, network, name, envConfig);
				},
			},
			{
				title: `Start Lisk Core: ${upgradeVersion}`,
				task: async () => {
					const isRunning = await isCacheRunning(installationPath, name);
					if (!isRunning) {
						await startCache(installationPath, name);
					}
					await startDatabase(installationPath, name);
					await restartApplication(name);
				},
			},
		]);

		await tasks.run();
	}
}
