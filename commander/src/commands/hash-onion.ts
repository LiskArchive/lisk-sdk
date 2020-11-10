/*
 * LiskHQ/lisk-commander
 * Copyright © 2020 Lisk Foundation
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
import { generateHashOnionSeed, hashOnion } from '@liskhq/lisk-cryptography';
import { isValidInteger } from '@liskhq/lisk-validator';
import { flags as flagParser } from '@oclif/command';
import fs from 'fs-extra';
import path from 'path';

import BaseCommand from '../base';

export default class HashOnionCommand extends BaseCommand {
	static description = `
  Creates hash onion output to be used by forger.
	`;

	static examples = ['hash-onion --count=1000000 --distance=2000'];

	static flags = {
		...BaseCommand.flags,
		output: flagParser.string({
			char: 'o',
			description: 'Output file path',
		}),
		count: flagParser.integer({
			char: 'c',
			description: 'Total number of hashes to produce',
			default: 1000000,
		}),
		distance: flagParser.integer({
			char: 'd',
			description: 'Distance between each hashes',
			default: 1000,
		}),
	};

	// tslint:disable-next-line no-async-without-await
	async run(): Promise<void> {
		const {
			flags: { output, count, distance },
		} = this.parse(HashOnionCommand);

		if (distance <= 0 || !isValidInteger(distance)) {
			throw new Error('Invalid distance. Distance has to be positive integer');
		}

		if (count <= 0 || !isValidInteger(count)) {
			throw new Error('Invalid count. Count has to be positive integer');
		}

		if (output) {
			const { dir } = path.parse(output);
			fs.ensureDirSync(dir);
		}

		const seed = generateHashOnionSeed();

		const hashBuffers = hashOnion(seed, count, distance);
		const hashes = hashBuffers.map(buf => buf.toString('hex'));

		const result = { count, distance, hashes };

		if (output) {
			fs.writeJSONSync(output, result);
		} else {
			this.print(result);
		}
	}
}
