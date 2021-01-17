/*
 * Copyright © 2021 Lisk Foundation
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
import { Command, flags as flagParser } from '@oclif/command';
import { NETWORK, RELEASE_URL, DEFAULT_NETWORK } from '../../../constants';
import { liskSnapshotUrl } from '../../../utils/commons';
import { getFullPath } from '../../../utils/path';
import { downloadAndValidate, getChecksum } from '../../../utils/download';
import { flags as commonFlags } from '../../../utils/flags';

export abstract class DownloadCommand extends Command {
	static description = 'Download snapshot from <URL>.';

	static examples = [
		'download',
		'download --network betanet',
		'download --url https://downloads.lisk.io/lisk/mainnet/blockchain.db.tar.gz --output ./downloads',
	];

	static flags = {
		network: flagParser.string({
			...commonFlags.network,
			env: 'LISK_NETWORK',
			default: DEFAULT_NETWORK,
		}),
		output: flagParser.string({
			char: 'o',
			description:
				'Directory path to specify where snapshot is downloaded. By default outputs the files to current working directory.',
		}),
		url: flagParser.string({
			char: 'u',
			description: 'The url to the snapshot.',
		}),
	};

	async run(): Promise<void> {
		const { flags } = this.parse(DownloadCommand);
		const network = flags.network ? (flags.network as NETWORK) : DEFAULT_NETWORK;
		const url = flags.url ? flags.url : liskSnapshotUrl(RELEASE_URL, network);
		const dataPath = flags.output ? flags.output : process.cwd();
		this.log(`Downloading snapshot from ${url} to ${getFullPath(dataPath)}`);

		try {
			await downloadAndValidate(url, dataPath);
			const checksum = getChecksum(url, dataPath);
			this.log(`Downloaded to path: ${dataPath}.`);
			this.log(`Verified checksum: ${checksum}.`);
		} catch (errors) {
			this.error(
				Array.isArray(errors) ? errors.map(err => (err as Error).message).join(',') : errors,
			);
		}
	}
}
