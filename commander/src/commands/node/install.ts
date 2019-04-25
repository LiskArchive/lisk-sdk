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
import { ProcessDescription } from 'pm2';
import BaseCommand from '../../base';
import {
	HTTP_PORTS,
	NETWORK,
	POSTGRES_PORT,
	REDIS_PORT,
	RELEASE_URL,
	SNAPSHOT_URL,
	WS_PORTS,
} from '../../utils/constants';
import {
	download,
	downloadLiskAndValidate,
	extract,
} from '../../utils/download';
import { flags as commonFlags } from '../../utils/flags';
import {
	createDirectory,
	getVersionToInstall,
	isSupportedOS,
	liskDbSnapshot,
	liskInstall,
	liskSnapshotUrl,
	liskTar,
	validateNetwork,
	validateNotARootUser,
	validateVersion,
	validURL,
} from '../../utils/node/commons';
import { defaultInstallationPath } from '../../utils/node/config';
import {
	createDatabase,
	createUser,
	initDB,
	restoreSnapshot,
	startDatabase,
	stopDatabase,
} from '../../utils/node/database';
import {
	listApplication,
	Pm2Env,
	registerApplication,
} from '../../utils/node/pm2';
import { getReleaseInfo } from '../../utils/node/release';

interface Flags {
	readonly installationPath: string;
	readonly 'lisk-version': string;
	readonly network: NETWORK;
	readonly 'no-snapshot': boolean;
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
	validURL(releaseUrl);
	validURL(snapshotUrl);
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

const getMaxValueByKey = (
	instances: ReadonlyArray<ProcessDescription>,
	key: string,
	defaultValue: number,
): number => {
	const apps = instances.map((app: ProcessDescription) => {
		const { pm2_env } = app;
		const {
			LISK_DB_PORT,
			LISK_REDIS_PORT,
			LISK_HTTP_PORT,
			LISK_WS_PORT,
		} = pm2_env as Pm2Env;

		return { LISK_DB_PORT, LISK_REDIS_PORT, LISK_HTTP_PORT, LISK_WS_PORT };
	});

	const maxValue = apps
		.map(app => ((app as unknown) as { readonly [key: string]: number })[key])
		.filter(i => i)
		.reduce((acc, curr) => Math.max(acc, curr), defaultValue);

	return maxValue + 1;
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
		'node:install --no-snapshot lisk-mainnet',
		'node:install --lisk-version=2.0.0 lisk-mainnet',
		'node:install --network=testnet --lisk-version=1.6.0-rc.4 lisk-testnet',
		'node:install --network=betanet --no-snapshot betanet-2.0',
	];

	static flags = {
		...BaseCommand.flags,
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
		'lisk-version': flagParser.string({
			...commonFlags.liskVersion,
		}),
		installationPath: flagParser.string({
			...commonFlags.installationPath,
			default: defaultInstallationPath,
		}),
		releaseUrl: flagParser.string({
			...commonFlags.releaseUrl,
			default: RELEASE_URL,
		}),
		snapshotUrl: flagParser.string({
			...commonFlags.snapshotUrl,
			default: SNAPSHOT_URL,
		}),
		'no-snapshot': flagParser.boolean({
			...commonFlags.noSnapshot,
			default: false,
			allowNo: false,
		}),
	};

	async run(): Promise<void> {
		const { args, flags } = this.parse(InstallCommand);
		const {
			network,
			snapshotUrl,
			'no-snapshot': noSnapshot,
			'lisk-version': liskVersion,
		} = flags as Flags;
		const { name }: Args = args;

		const cacheDir = this.config.cacheDir;
		const snapshotPath = `${cacheDir}/${liskDbSnapshot(name, network)}`;
		const snapshotURL = liskSnapshotUrl(snapshotUrl, network);

		const tasks = new Listr([
			{
				title: `Install Lisk Core ${network} as ${name}`,
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
								const {
									version,
									liskTarUrl,
									liskTarSHA256Url,
								}: Options = ctx.options;

								if (!noSnapshot) {
									await downloadLiskAndValidate(
										cacheDir,
										liskTarUrl,
										liskTarSHA256Url,
										version,
									);

									return;
								}
								await Promise.all([
									downloadLiskAndValidate(
										cacheDir,
										liskTarUrl,
										liskTarSHA256Url,
										version,
									),
									download(snapshotURL, snapshotPath),
								]);
							},
						},
						{
							title: 'Extract Lisk Core',
							task: async ctx => {
								const { installDir, version }: Options = ctx.options;
								createDirectory(installDir);
								await extract(cacheDir, liskTar(version), installDir);
							},
						},
						{
							title: 'Register Lisk Core',
							task: async ctx => {
								const { installDir }: Options = ctx.options;
								const instances = await listApplication();

								const LISK_DB_PORT = getMaxValueByKey(
									instances,
									'LISK_DB_PORT',
									POSTGRES_PORT,
								);
								const LISK_REDIS_PORT = getMaxValueByKey(
									instances,
									'LISK_REDIS_PORT',
									REDIS_PORT,
								);
								const LISK_HTTP_PORT = getMaxValueByKey(
									instances,
									'LISK_HTTP_PORT',
									HTTP_PORTS[network],
								);
								const LISK_WS_PORT = getMaxValueByKey(
									instances,
									'LISK_WS_PORT',
									WS_PORTS[network],
								);
								const envConfig = {
									LISK_DB_PORT,
									LISK_REDIS_PORT,
									LISK_HTTP_PORT,
									LISK_WS_PORT,
								};

								await registerApplication(installDir, network, name, envConfig);
							},
						},
						{
							title: 'Create Database and restore Lisk Blockchain Snapshot',
							task: async ctx => {
								const { installDir }: Options = ctx.options;

								try {
									await initDB(installDir);
									await startDatabase(installDir, name);
									await createUser(installDir, network, name);
									await createDatabase(installDir, network, name);
									if (!noSnapshot) {
										await restoreSnapshot(
											installDir,
											network,
											snapshotPath,
											name,
										);
									}
									await stopDatabase(installDir, name);
								} catch (error) {
									throw error;
								}
							},
						},
					]),
			},
		]);

		try {
			await tasks.run();
		} catch (error) {
			const { installDir }: Options = error.context.options;
			const dirPath = installDir.substr(0, installDir.length - 1);

			fsExtra.emptyDirSync(installDir);
			fsExtra.rmdirSync(dirPath);
			this.error(`Failed to install Lisk Core with error :\n ${error.stderr}`);
		}
	}
}
