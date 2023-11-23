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

import * as crypto from 'crypto';
import { Command } from '@oclif/core';
import { getBlockchainDBPath, getDefaultPath, getFullPath } from '../../../utils/path';
import { getPid, isApplicationRunning } from '../../../utils/application';
import { getBlockchainDB } from '../../../utils/db';
import { flagsWithParser } from '../../../utils/flags';

export class HashCommand extends Command {
	static description = 'Generate SHA256 hash from <PATH>.';

	static examples = ['blockchain:hash', 'blockchain:hash --data-path ./data'];

	static flags = {
		'data-path': flagsWithParser.dataPath,
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(HashCommand);
		const dataPath = flags['data-path']
			? flags['data-path']
			: getDefaultPath(this.config.pjson.name);
		const blockchainPath = getBlockchainDBPath(dataPath);

		if (isApplicationRunning(dataPath)) {
			const errorMessage = `Can't generate hash for a running application. Application at data path ${dataPath} is running with pid ${getPid(
				dataPath,
			)}.`;

			this.error(errorMessage);
			return;
		}

		this.debug('Compressing data to generate hash.');
		this.debug(`   ${getFullPath(blockchainPath)}`);

		const db = getBlockchainDB(dataPath);
		const stream = db.createReadStream({});

		const dbHash = crypto.createHash('sha256');

		const hash: Buffer = await new Promise((resolve, reject) => {
			stream.on('data', ({ value }: { key: Buffer; value: Buffer }) => {
				dbHash.update(value);
			});

			stream.on('error', error => {
				reject(error);
			});

			stream.on('end', () => {
				resolve(dbHash.digest());
			});
		});

		this.debug('Hash generation completed.');

		this.log(hash.toString('hex'));
	}
}
