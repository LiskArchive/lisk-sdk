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
import BaseCommand from '../../base';
import getInputsFromSources from '../../utils/input';
import cryptography from '../../utils/cryptography';
import commonOptions from '../../utils/options';

const processInput = ({ passphrase }) => {
	const { privateKey, publicKey } = cryptography.getKeys(passphrase);
	const { address } = cryptography.getAddressFromPublicKey(publicKey);
	return {
		privateKey,
		publicKey,
		address,
	};
};

export default class ShowCommand extends BaseCommand {
	async run() {
		const { flags: { passphrase: passphraseSource } } = this.parse(ShowCommand);
		const input = await getInputsFromSources({
			passphrase: {
				source: passphraseSource,
				repeatPrompt: true,
			},
		});
		this.print(processInput(input));
	}
}

ShowCommand.flags = {
	...BaseCommand.flags,
	passphrase: flagParser.string(commonOptions.passphrase),
};

ShowCommand.description = `
Shows account information for a given passphrase.
`;
ShowCommand.examples = ['account:show'];
