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
import commonOptions from '../../utils/options';
import getInputsFromSources from '../../utils/input';
import cryptography from '../../utils/cryptography';

const outputPublicKeyOptionDescription =
	'Includes the public key in the output. This option is provided for the convenience of node operators.';

const processInputs = outputPublicKey => ({ passphrase, password }) => {
	const cipherAndIv = cryptography.encryptPassphrase({ passphrase, password });
	return outputPublicKey
		? Object.assign({}, cipherAndIv, {
				publicKey: cryptography.getKeys(passphrase).publicKey,
			})
		: cipherAndIv;
};

export default class EncryptCommand extends BaseCommand {
	async run() {
		const {
			flags: {
				passphrase: passphraseSource,
				password: passwordSource,
				outputPublicKey,
			},
		} = this.parse(EncryptCommand);
		const inputs = await getInputsFromSources({
			passphrase: {
				source: passphraseSource,
				repeatPrompt: true,
			},
			password: {
				source: passwordSource,
				repeatPrompt: true,
			},
		});
		const result = processInputs(outputPublicKey)(inputs);
		this.print(result);
	}
}

EncryptCommand.flags = {
	...BaseCommand.flags,
	password: flagParser.string(commonOptions.password),
	passphrase: flagParser.string(commonOptions.passphrase),
	outputPublicKey: flagParser.boolean({
		description: outputPublicKeyOptionDescription,
	}),
};

EncryptCommand.description = `
Encrypts your secret passphrase under a password.
`;

EncryptCommand.examples = ['passphrase:encrypt'];
