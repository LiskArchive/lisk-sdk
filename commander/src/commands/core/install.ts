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
import { flags as flagParser } from '@oclif/command';
import * as fsExtra from 'fs-extra';
import Listr from 'listr';
import * as os from 'os';
import BaseCommand from '../../base';
import { NETWORK, RELEASE_URL, SNAPSHOT_URL } from '../../utils/constants';
import {
	createDirectory,
	generateEnvConfig,
	getDownloadedFileInfo,
	getVersionToInstall,
	isSupportedOS,
	liskInstall,
	liskLatestUrl,
	liskSnapshotUrl,
	validateNetwork,
	validateNotARootUser,
	validateVersion,
	validURL,
} from '../../utils/core/commons';
import {
	createDatabase,
	createUser,
	initDB,
	restoreSnapshot,
	startDatabase,
	stopDatabase,
} from '../../utils/core/database';
import { describeApplication, registerApplication } from '../../utils/core/pm2';
import { getReleaseInfo } from '../../utils/core/release';
import { download, downloadAndValidate, extract } from '../../utils/download';
import { flags as commonFlags } from '../../utils/flags';
import StartCommand from './start';

interface Flags {
	readonly 'installation-path': string;
	readonly 'lisk-version': string;
	readonly network: NETWORK;
	readonly 'no-snapshot': boolean;
	readonly 'no-start': boolean;
	readonly 'release-url': string;
	readonly 'snapshot-url': string;
}

interface Args {
	readonly name: string;
}

interface Options {
	readonly installDir: string;
	readonly liskTarSHA256Url: string;
	readonly liskTarUrl: string;
	readonly version: string;
	readonly latestUrl: string;
}

const validatePrerequisite = (installPath: string): void => {
	if (!isSupportedOS()) {
		throw new Error(`Lisk Core installation is not supported on ${os.type()}.`);
	}
	if (fsExtra.pathExistsSync(installPath)) {
		throw new Error(
			`Lisk Core installation already exists in path ${installPath}.`,
		);
	}
};

const validateFlags = ({
	network,
	'release-url': releaseUrl,
	'snapshot-url': snapshotUrl,
}: Flags): void => {
	validateNetwork(network);
	if (releaseUrl) {
		validURL(releaseUrl);
	}
	if (snapshotUrl) {
		validURL(snapshotUrl);
	}
};

const installOptions = async (
	{
		'installation-path': installationPath,
		network,
		'release-url': releaseUrl,
		'lisk-version': liskVersion,
	}: Flags,
	name: string,
): Promise<Options> => {
	const installPath = liskInstall(installationPath);
	const installDir = `${installPath}/${name}/`;
	const latestUrl = releaseUrl || liskLatestUrl(RELEASE_URL, network);

	const installVersion: string = await getVersionToInstall(
		network,
		liskVersion,
		releaseUrl,
	);

	const { version, liskTarUrl, liskTarSHA256Url } = await getReleaseInfo(
		latestUrl,
		network,
		installVersion,
	);

	return {
		installDir,
		version,
		liskTarUrl,
		liskTarSHA256Url,
		latestUrl,
	};
};

export default class InstallCommand extends BaseCommand {
	static args = [
		{
			name: 'name',
			description: 'Lisk Core installation directory name.',
			required: true,
		},
	];

	static description = 'Install an instance of Lisk Core.';

	static examples = [
		'core:install lisk-mainnet',
		'core:install --no-start lisk-mainnet',
		'core:install --no-snapshot lisk-mainnet',
		'core:install --lisk-version=2.0.0 lisk-mainnet',
		'core:install --network=testnet --release-url=https://downloads.lisk.io/lisk/mainnet/1.6.0/lisk-1.6.0-Linux-x86_64.tar.gz lisk-mainnet',
		'core:install --network=mainnet --snapshot-url=https://downloads.lisk.io/lisk/mainnet/blockchain.db.gz custom-mainnet',
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
		'installation-path': flagParser.string({
			...commonFlags.installationPath,
			default: '~/.lisk/instances',
			hidden: true,
		}),
		'lisk-version': flagParser.string({
			...commonFlags.liskVersion,
		}),
		'no-snapshot': flagParser.boolean({
			...commonFlags.noSnapshot,
			default: false,
			allowNo: false,
		}),
		'no-start': flagParser.boolean({
			...commonFlags.noStart,
			default: false,
			allowNo: false,
		}),
		network: flagParser.string({
			...commonFlags.network,
			default: NETWORK.MAINNET,
			options: [
				NETWORK.MAINNET,
				NETWORK.TESTNET,
				NETWORK.BETANET,
				NETWORK.ALPHANET,
				NETWORK.DEVNET,
			],
		}),
		'release-url': flagParser.string({
			...commonFlags.releaseUrl,
		}),
		'snapshot-url': flagParser.string({
			...commonFlags.snapshotUrl,
			default: SNAPSHOT_URL,
		}),
	};

	async run(): Promise<void> {
		const { args, flags } = this.parse(InstallCommand);
		const {
			'lisk-version': liskVersion,
			'no-snapshot': noSnapshot,
			'no-start': noStart,
			network,
			'snapshot-url': snapshotUrl,
		} = flags as Flags;
		const { name }: Args = args;

		const { cacheDir } = this.config;
		// TODO: Commander not creating cache directory
		// This is a patch to handle the scenario
		fsExtra.ensureDirSync(cacheDir);
		const snapshotURL = liskSnapshotUrl(snapshotUrl, network);

		const tasks = new Listr([
			{
				title: `Install Lisk Core ${network} instance as ${name}`,
				task: () =>
					new Listr([
						{
							title: 'Prepare Install Options',
							task: async ctx => {
								const options: Options = await installOptions(
									flags as Flags,
									name,
								);
								ctx.options = options;
							},
						},
						{
							title: 'Validate root user, flags, prerequisites',
							task: async ctx => {
								const { installDir, latestUrl } = ctx.options;
								validateNotARootUser();
								validateFlags(flags as Flags);
								validatePrerequisite(installDir);
								if (liskVersion) {
									await validateVersion(latestUrl, liskVersion);
									ctx.options.version = liskVersion;
								}
							},
						},
						{
							title: 'Download Lisk Core Release and Blockchain Snapshot',
							task: async ctx => {
								const { liskTarUrl }: Options = ctx.options;

								if (!noSnapshot && snapshotURL.trim() !== '') {
									await download(snapshotURL, cacheDir);
								}
								await downloadAndValidate(liskTarUrl, cacheDir);
							},
						},
						{
							title: 'Extract Lisk Core',
							task: async ctx => {
								const { installDir, liskTarUrl }: Options = ctx.options;
								const { fileName, fileDir } = getDownloadedFileInfo(
									liskTarUrl,
									cacheDir,
								);

								createDirectory(installDir);
								await extract(fileDir, fileName, installDir);
							},
						},
						{
							title: 'Register Lisk Core',
							task: async ctx => {
								const { installDir }: Options = ctx.options;
								const envConfig = await generateEnvConfig(network);

								await registerApplication(installDir, network, name, envConfig);
							},
						},
						{
							title: 'Create Database and restore Lisk Blockchain Snapshot',
							task: async ctx => {
								const { installDir }: Options = ctx.options;

								await initDB(installDir);
								await startDatabase(installDir, name);
								await createUser(installDir, network, name);
								await createDatabase(installDir, network, name);
								if (!noSnapshot) {
									const { filePath } = getDownloadedFileInfo(
										snapshotURL,
										cacheDir,
									);

									await restoreSnapshot(installDir, network, filePath, name);
								}
								await stopDatabase(installDir, name);
							},
						},
					]),
			},
		]);

		try {
			const instance = await describeApplication(name);
			if (instance) {
				this.log(`\n Lisk Core instance ${name} already installed: `);
				this.print(instance);

				return;
			}

			await tasks.run();
			if (!noStart) {
				// tslint:disable-next-line await-promise
				await StartCommand.run([name]);
				const newInstance = await describeApplication(name);
				this.print(newInstance);

				return;
			}
		} catch (error) {
			this.error(JSON.stringify(error));
			const { installDir }: Options = error.context.options;
			const dirPath = installDir.substr(0, installDir.length - 1);

			fsExtra.emptyDirSync(installDir);
			fsExtra.rmdirSync(dirPath);
		}
	}
}
