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

import { Command, Flags as flagParser } from '@oclif/core';
import * as cryptography from '@liskhq/lisk-cryptography';
import * as validator from '@liskhq/lisk-validator';
import { flagsWithParser } from '../../utils/flags';
import { handleOutputFlag } from '../../utils/output';

export class HashOnionCommand extends Command {
	static description = 'Create hash onions to be used by the forger.';

	static examples = [
		'hash-onion --count=1000000 --distance=2000 --pretty',
		'hash-onion --count=1000000 --distance=2000 --output ~/my_onion.json',
	];

	static flags = {
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
			description: 'Distance between each hash',
			default: 1000,
		}),
		pretty: flagsWithParser.pretty,
	};

	async run(): Promise<void> {
		const {
			flags: { output, count, distance, pretty },
		} = await this.parse(HashOnionCommand);

		if (distance <= 0 || !validator.isValidInteger(distance)) {
			throw new Error('Distance flag must be an integer and greater than 0.');
		}

		if (count <= 0 || !validator.isValidInteger(count)) {
			throw new Error('Count flag must be an integer and greater than 0.');
		}

		const seed = cryptography.utils.generateHashOnionSeed();

		const hashBuffers = cryptography.utils.hashOnion(seed, count, distance);
		const hashes = hashBuffers.map(buf => buf.toString('hex'));

		const result = { count, distance, hashes };

		if (output) {
			const res = await handleOutputFlag(output, result, 'hash-onion');
			this.log(res);
		} else {
			this.printJSON(result, pretty);
		}
	}

	public printJSON(message?: object, pretty = false): void {
		if (pretty) {
			this.log(JSON.stringify(message, undefined, '  '));
		} else {
			this.log(JSON.stringify(message));
		}
	}
}
