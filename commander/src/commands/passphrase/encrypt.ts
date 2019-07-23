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
import {
	encryptPassphraseWithPassword,
	getKeys,
	stringifyEncryptedPassphrase,
} from '@liskhq/lisk-cryptography';
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import { ValidationError } from '../../utils/error';
import { flags as commonFlags } from '../../utils/flags';
import { getInputsFromSources, InputFromSourceOutput } from '../../utils/input';

const outputPublicKeyOptionDescription =
	'Includes the public key in the output. This option is provided for the convenience of node operators.';

const processInputs = (outputPublicKey: boolean) => ({
	passphrase,
	password,
}: InputFromSourceOutput) => {
	if (!passphrase) {
		throw new ValidationError('No passphrase was provided');
	}
	if (!password) {
		throw new ValidationError('No password was provided');
	}

	const encryptedPassphraseObject = encryptPassphraseWithPassword(
		passphrase,
		password,
	);
	const encryptedPassphrase = stringifyEncryptedPassphrase(
		encryptedPassphraseObject,
	);

	return outputPublicKey
		? {
				encryptedPassphrase,
				publicKey: getKeys(passphrase).publicKey,
		  }
		: { encryptedPassphrase };
};

export default class EncryptCommand extends BaseCommand {
	static description = `
		Encrypts your secret passphrase under a password.
	`;

	static examples = ['passphrase:encrypt'];

	static flags = {
		...BaseCommand.flags,
		password: flagParser.string(commonFlags.password),
		passphrase: flagParser.string(commonFlags.passphrase),
		outputPublicKey: flagParser.boolean({
			description: outputPublicKeyOptionDescription,
		}),
	};

	async run(): Promise<void> {
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
