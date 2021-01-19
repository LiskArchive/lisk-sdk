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

import { flags as flagParser, Command } from '@oclif/command';
import * as fs from 'fs-extra';
import * as path from 'path';
import { cryptography, validator } from 'lisk-sdk';
import { encryptPassphrase } from '../../../utils/commons';
import { flags as commonFlags } from '../../../utils/flags';
import { getPassphraseFromPrompt, getPasswordFromPrompt } from '../../../utils/reader';

export default class ConfigCommand extends Command {
	static description = 'Generate delegate forging config for given passphrase and password.';

	static examples = [
		'forging:config',
		'forging:config --password your_password',
		'forging:config --passphrase your_passphrase --password your_password --pretty',
		'forging:config --count=1000000 --distance=2000 --output /tmp/forging_config.json',
	];

	static flags = {
		password: flagParser.string({ ...commonFlags.password }),
		passphrase: flagParser.string({ ...commonFlags.passphrase }),
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
		output: flagParser.string({
			char: 'o',
			description: 'Output file path',
		}),
		pretty: flagParser.boolean({
			description: 'Prints JSON in pretty format rather than condensed.',
		}),
	};

	async run(): Promise<void> {
		const {
			flags: {
				count,
				distance,
				output,
				passphrase: passphraseSource,
				password: passwordSource,
				pretty,
			},
		} = this.parse(ConfigCommand);

		if (distance <= 0 || !validator.isValidInteger(distance)) {
			throw new Error('Distance flag must be an integer and greater than 0.');
		}

		if (count <= 0 || !validator.isValidInteger(count)) {
			throw new Error('Count flag must be an integer and greater than 0.');
		}

		if (output) {
			const { dir } = path.parse(output);
			fs.ensureDirSync(dir);
		}

		const seed = cryptography.generateHashOnionSeed();

		const hashBuffers = cryptography.hashOnion(seed, count, distance);
		const hashes = hashBuffers.map(buf => buf.toString('hex'));
		const hashOnion = { count, distance, hashes };

		const passphrase = passphraseSource ?? (await getPassphraseFromPrompt('passphrase', true));
		const address = cryptography.getAddressFromPassphrase(passphrase).toString('hex');
		const password = passwordSource ?? (await getPasswordFromPrompt('password', true));
		const { encryptedPassphrase } = encryptPassphrase(passphrase, password, false);
		const message = { address, encryptedPassphrase, hashOnion };

		if (output) {
			if (pretty) {
				fs.writeJSONSync(output, message, { spaces: ' ' });
			} else {
				fs.writeJSONSync(output, message);
			}
		} else {
			this.printJSON(message, pretty);
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
