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
import * as os from 'os';
import BaseCommand from '../../base';
import { NETWORK, SNAPSHOT_URL } from '../../utils/constants';
import {
	createDirectory,
	generateEnvConfig,
	getDownloadedFileInfo,
	getVersionToInstall,
	isSupportedOS,
	liskInstall,
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
import { registerApplication } from '../../utils/core/pm2';
import { getReleaseInfo } from '../../utils/core/release';
import { download, downloadAndValidate, extract } from '../../utils/download';
import { flags as commonFlags } from '../../utils/flags';
import StartCommand from './start';

interface Flags {
	readonly installationPath: string;
	readonly 'lisk-version': string;
	readonly network: NETWORK;
	readonly 'no-snapshot': boolean;
	readonly 'no-start': boolean;
	readonly releaseUrl: string;
	readonly snapshotUrl: string;
}

interface Args {
	readonly name: string;
}

interface Options {
	readonly installDir: string;
	readonly liskTarSHA256Url: string;
	readonly liskTarUrl: string;
	readonly version: string;
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

const validateFlags = ({ network, releaseUrl, snapshotUrl }: Flags): void => {
	validateNetwork(network);
	if (releaseUrl) {
		validURL(releaseUrl);
	}
	if (snapshotUrl) {
		validURL(snapshotUrl);
	}
};

const installOptions = async (
	{ installationPath, network, releaseUrl, 'lisk-version': liskVersion }: Flags,
	name: string,
): Promise<Options> => {
	const installPath = liskInstall(installationPath);
	const installDir = `${installPath}/${name}/`;
	const installVersion: string = await getVersionToInstall(
		network,
		liskVersion,
	);

	const { version, liskTarUrl, liskTarSHA256Url } = await getReleaseInfo(
		releaseUrl,
		network,
		installVersion,
	);

	return {
		installDir,
		version,
		liskTarUrl,
		liskTarSHA256Url,
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
		'node:install lisk-mainnet',
		'node:install --no-start lisk-mainnet',
		'node:install --no-snapshot lisk-mainnet',
		'node:install --lisk-version=2.0.0 lisk-mainnet',
		'node:install --network=testnet --releaseUrl=https://downloads.lisk.io/lisk/mainnet/1.6.0/lisk-1.6.0-Linux-x86_64.tar.gz lisk-mainnet',
		'node:install --network=mainnet --snapshotUrl=https://testnet-snapshot.lisknode.io/blockchain.db.gz custom-mainnet',
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
		installationPath: flagParser.string({
			...commonFlags.installationPath,
			default: '~/.lisk/instances',
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
		releaseUrl: flagParser.string({
			...commonFlags.releaseUrl,
		}),
		snapshotUrl: flagParser.string({
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
			snapshotUrl,
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
								validateNotARootUser();
								validateFlags(flags as Flags);
								validatePrerequisite(ctx.options.installDir);
								if (liskVersion) {
									await validateVersion(network, liskVersion);
									ctx.options.version = liskVersion;
								}
							},
						},
						{
							title: 'Download Lisk Core Release and Blockchain Snapshot',
							task: async ctx => {
								const { liskTarUrl }: Options = ctx.options;

								if (!noSnapshot) {
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
			await tasks.run();
			if (!noStart) {
				return StartCommand.run([name]);
			}
		} catch (error) {
			const { installDir }: Options = error.context.options;
			const dirPath = installDir.substr(0, installDir.length - 1);

			fsExtra.emptyDirSync(installDir);
			fsExtra.rmdirSync(dirPath);
			this.error(JSON.stringify(error));
		}
	}
}
