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
import cryptography from '../../utils/cryptography';
import { ValidationError } from '../../utils/error';
import getInputsFromSources from '../../utils/input';
import commonOptions from '../../utils/options';

const processInputs = (nonce, senderPublicKey, message) => ({
	passphrase,
	data,
}) =>
	cryptography.decryptMessage({
		cipher: message || data,
		nonce,
		passphrase,
		senderPublicKey,
	});

export default class DecryptCommand extends BaseCommand {
	async run() {
		const {
			args: { senderPublicKey, nonce, message },
			flags: { passphrase: passphraseSource, message: messageSource },
		} = this.parse(DecryptCommand);

		if (!message && !messageSource) {
			throw new ValidationError('No message was provided.');
		}

		const inputs = await getInputsFromSources({
			passphrase: {
				source: passphraseSource,
			},
			data: message
				? null
				: {
						source: messageSource,
					},
		});
		const result = processInputs(nonce, senderPublicKey, message)(inputs);
		this.print(result);
	}
}

DecryptCommand.args = [
	{
		name: 'senderPublicKey',
		description: 'Public key of the sender of the message.',
		required: true,
	},
	{
		name: 'nonce',
		description: 'Specified nonce of the encryption.',
		required: true,
	},
	{
		name: 'message',
		description: 'Encrypted message.',
	},
];

DecryptCommand.flags = {
	...BaseCommand.flags,
	passphrase: flagParser.string(commonOptions.passphrase),
	message: flagParser.string(commonOptions.message),
};

DecryptCommand.description = `
Decrypts a previously encrypted message from a given sender public key for a known nonce using your secret passphrase.
`;

DecryptCommand.examples = [
	'message:decrypt bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0 349d300c906a113340ff0563ef14a96c092236f331ca4639 e501c538311d38d3857afefa26207408f4bf7f1228',
];
