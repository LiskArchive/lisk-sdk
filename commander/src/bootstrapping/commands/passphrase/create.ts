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
import { Command, Flags as flagParser } from '@oclif/core';
import { handleOutputFlag } from '../../../utils/output';

export class CreateCommand extends Command {
	static description = 'Returns a randomly generated 24 words mnemonic passphrase.';
	static examples = ['passphrase:create', 'passphrase:create --output /mypath/passphrase.json'];
	static flags = {
		output: flagParser.string({
			char: 'o',
			description: 'The output directory. Default will set to current working directory.',
		}),
	};

	async run(): Promise<void> {
		const {
			flags: { output },
		} = await this.parse(CreateCommand);

		const passphrase = Mnemonic.generateMnemonic(256);

		if (output) {
			const res = await handleOutputFlag(output, { passphrase }, 'passphrase');
			this.log(res);
		} else {
			this.log(JSON.stringify({ passphrase }, undefined, '  '));
		}
	}
}
