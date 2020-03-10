/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import { getAddressFromPublicKey, getKeys } from '@liskhq/lisk-cryptography';
import { flags as flagParser } from '@oclif/command';

import BaseCommand from '../../base';
import { flags as commonFlags } from '../../utils/flags';
import { getPassphraseFromPrompt } from '../../utils/reader';

const processInput = (passphrase: string) => {
	const { privateKey, publicKey } = getKeys(passphrase);
	const address = getAddressFromPublicKey(publicKey);

	return {
		privateKey,
		publicKey,
		address,
	};
};

export default class ShowCommand extends BaseCommand {
	static description = `
		Shows account information for a given passphrase.
	`;

	static examples = ['account:show'];

	static flags = {
		...BaseCommand.flags,
		passphrase: flagParser.string(commonFlags.passphrase),
	};

	async run(): Promise<void> {
		const {
			flags: { passphrase: passphraseSource },
		} = this.parse(ShowCommand);
		const passphrase =
			passphraseSource ?? (await getPassphraseFromPrompt('passphrase', true));

		this.print(processInput(passphrase));
	}
}
