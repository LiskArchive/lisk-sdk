/*
 * Copyright © 2022 Lisk Foundation
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

import { Mnemonic } from '@liskhq/lisk-passphrase';
import { Command } from '@oclif/core';
import * as fs from 'fs-extra';
import * as path from 'path';
import { flagsWithParser } from '../../../utils/flags';
import { OWNER_READ_WRITE } from '../../../constants';

export class CreateCommand extends Command {
	static description = 'Returns a randomly generated 24 words mnemonic passphrase.';
	static examples = ['passphrase:create', 'passphrase:create --output /mypath/passphrase.json'];
	static flags = {
		output: flagsWithParser.output,
	};

	async run(): Promise<void> {
		const {
			flags: { output },
		} = await this.parse(CreateCommand);

		if (output) {
			const { dir } = path.parse(output);
			fs.ensureDirSync(dir);
		}

		const passphrase = Mnemonic.generateMnemonic(256);

		if (output) {
			fs.writeJSONSync(output, { passphrase }, { spaces: ' ', mode: OWNER_READ_WRITE });
		} else {
			this.log(JSON.stringify({ passphrase }, undefined, '  '));
		}
	}
}
