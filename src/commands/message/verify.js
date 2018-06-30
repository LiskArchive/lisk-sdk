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

const processInputs = (publicKey, signature, message) => ({ data }) =>
	cryptography.verifyMessage({
		publicKey,
		signature,
		message: message || data,
	});

export default class VerifyCommand extends BaseCommand {
	async run() {
		const {
			args: { publicKey, signature, message },
			flags: { message: messageSource },
		} = this.parse(VerifyCommand);

		if (!message && !messageSource) {
			throw new ValidationError('No message was provided.');
		}

		const inputs = await getInputsFromSources({
			data: message ? null : { source: messageSource },
		});
		const result = processInputs(publicKey, signature, message)(inputs);
		this.print(result);
	}
}

VerifyCommand.args = [
	{
		name: 'publicKey',
		description: 'Public key which signed the message.',
		required: true,
	},
	{
		name: 'signature',
		description: 'Signature of the message.',
		required: true,
	},
	{
		name: 'message',
		description: 'Message to to verify.',
	},
];

VerifyCommand.flags = {
	...BaseCommand.flags,
	message: flagParser.string(commonOptions.message),
};

VerifyCommand.description = `
Verify a message using the public key, the signature and the message.
`;

VerifyCommand.examples = [
	'message:verify 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6 2a3ca127efcf7b2bf62ac8c3b1f5acf6997cab62ba9fde3567d188edcbacbc5dc8177fb88d03a8691ce03348f569b121bca9e7a3c43bf5c056382f35ff843c09 "Hello world"',
];
