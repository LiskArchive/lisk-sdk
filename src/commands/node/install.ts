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
import { NETWORK, RELEASE_URL, SNAPSHOT_URL } from '../../utils/constants';
import {
	download,
	downloadLiskAndValidate,
	extract,
} from '../../utils/download';
import { flags as commonFlags } from '../../utils/flags';
import {
	createDirectory,
	isSupportedOS,
	liskDbSnapshot,
	liskInstall,
	liskLatestUrl,
	liskSnapshotUrl,
	liskTar,
	validateNetwork,
	validateNotARootUser,
	validURL,
} from '../../utils/node/commons';
import { defaultInstallationPath } from '../../utils/node/config';
import {
	createDatabase,
	createUser,
	initDB,
	startDatabase,
	stopDatabase,
} from '../../utils/node/database';
import { registerApplication } from '../../utils/node/pm2';
import { getReleaseInfo } from '../../utils/node/release';

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
	if (!isSupportedOS()) {
		throw new Error(`Lisk installation is not supported on ${os.type()}`);
	}
	if (fsExtra.pathExistsSync(installPath)) {
		throw new Error(`Installation already exists in path ${installPath}`);
	}
};

const validateFlags = ({ network, releaseUrl, snapshotUrl }: Flags): void => {
	validateNetwork(network);
	validURL(releaseUrl);
	validURL(snapshotUrl);
};

const installOptions = async ({
	installationPath,
	name,
	network,
	releaseUrl,
}: Flags): Promise<Options> => {
	const installPath = liskInstall(installationPath);
	const installDir = `${installPath}/${name}/`;
	const latestURL = liskLatestUrl(releaseUrl, network);
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

export default class InstallCommand extends BaseCommand {
	static description = 'Install Lisk';

	static examples = [
		'node:install --name=mainnet-1.6',
		'node:install --network=testnet --name=testnet-1.6',
		'node:install --network=betanet --name=betanet-2.0 --no-snapshot',
	];

	static flags = {
		...BaseCommand.flags,
		network: flagParser.string({
			...commonFlags.network,
			default: NETWORK.MAINNET,
			options: [NETWORK.MAINNET, NETWORK.TESTNET, NETWORK.BETANET],
		}),
		installationPath: flagParser.string({
			...commonFlags.installationPath,
			default: defaultInstallationPath,
		}),
		name: flagParser.string({
			...commonFlags.name,
			default: NETWORK.MAINNET,
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
		const { flags } = this.parse(InstallCommand);
		const {
			name,
			network,
			snapshotUrl,
			'no-snapshot': noSnapshot,
		} = flags as Flags;
		const cacheDir = this.config.cacheDir;

		const tasks = new Listr([
			{
				title: `Install Lisk ${network} as ${name}`,
				task: () =>
					new Listr([
						{
							title: 'Prepare Install Options',
							task: async ctx => {
								const options: Options = await installOptions(flags as Flags);
								ctx.options = options;
							},
						},
						{
							title: 'Validate root user, flags, prerequisites',
							task: ctx => {
								validateNotARootUser();
								validateFlags(flags as Flags);
								validatePrerequisite(ctx.options.installDir);
							},
						},
						{
							title: 'Download Lisk Release',
							task: async ctx => {
								const { version }: Options = ctx.options;
								const releaseUrl = `${RELEASE_URL}/${network}/${version}`;

								await downloadLiskAndValidate(cacheDir, releaseUrl, version);
							},
						},
						{
							title: 'Download Blockchain Snapshot',
							skip: () => noSnapshot,
							task: async () => {
								const snapshotPath = `${cacheDir}/${liskDbSnapshot(
									name,
									network,
								)}`;
								const snapshotURL = liskSnapshotUrl(snapshotUrl, network);
								await download(snapshotURL, snapshotPath);
							},
						},
						{
							title: 'Extract Lisk',
							task: async ctx => {
								const { installDir, version }: Options = ctx.options;
								createDirectory(installDir);
								await extract(cacheDir, liskTar(version), installDir);
							},
						},
						{
							title: 'Create Database',
							task: async ctx => {
								const { installDir }: Options = ctx.options;

								await initDB(installDir);
								await startDatabase(installDir);
								await createUser(installDir, network);
								await createDatabase(installDir, network);
								await stopDatabase(installDir);
							},
						},
						{
							title: 'Register Lisk',
							task: async ctx => {
								const { installDir }: Options = ctx.options;
								await registerApplication(installDir, network, name);
							},
						},
					]),
			},
		]);

		await tasks.run();
	}
}
