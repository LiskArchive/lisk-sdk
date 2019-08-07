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
import { decryptMessageWithPassphrase } from '@liskhq/lisk-cryptography';
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import { ValidationError } from '../../utils/error';
import { flags as commonFlags } from '../../utils/flags';
import { getInputsFromSources, InputFromSourceOutput } from '../../utils/input';

interface Args {
	readonly message?: string;
	readonly nonce: string;
	readonly senderPublicKey: string;
}

const processInputs = (
	nonce: string,
	senderPublicKey: string,
	message?: string,
) => ({ passphrase, data }: InputFromSourceOutput) => {
	const targetMessage = message || data;
	if (!targetMessage) {
		throw new ValidationError('No message was provided.');
	}
	if (!passphrase) {
		throw new ValidationError('No passphrase was provided.');
	}

	return decryptMessageWithPassphrase(
		targetMessage,
		nonce,
		passphrase,
		senderPublicKey,
	);
};

export default class DecryptCommand extends BaseCommand {
	static args = [
		{
			name: 'senderPublicKey',
			description: 'Public key of the sender of the message.',
			required: true,
		},
		{
			name: 'nonce',
			description: 'Nonce used during encryption.',
			required: true,
		},
		{
			name: 'message',
			description: 'Encrypted message.',
		},
	];

	static description = `
	Decrypts a previously encrypted message from a given sender public key for a known nonce using your secret passphrase.
	`;

	static examples = [
		'message:decrypt bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0 4b800d90d54eda4d093b5e4e6bf9ed203bc90e1560bd628d dcaa605af45a4107a699755237b4c08e1ef75036743d7e4814dea7',
	];

	static flags = {
		...BaseCommand.flags,
		passphrase: flagParser.string(commonFlags.passphrase),
		message: flagParser.string(commonFlags.message),
	};
	async run(): Promise<void> {
		const {
			args,
			flags: { passphrase: passphraseSource, message: messageSource },
		} = this.parse(DecryptCommand);

		const { senderPublicKey, nonce, message }: Args = args;

		if (!message && !messageSource) {
			throw new ValidationError('No message was provided.');
		}

		const inputs = await getInputsFromSources({
			passphrase: {
				source: passphraseSource,
			},
			data: message
				? undefined
				: {
						source: messageSource,
				  },
		});
		const result = processInputs(nonce, senderPublicKey, message)(inputs);
		this.print({ message: result });
	}
}
