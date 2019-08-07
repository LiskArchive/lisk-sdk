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
import { verifyMessageWithPublicKey } from '@liskhq/lisk-cryptography';
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import { ValidationError } from '../../utils/error';
import { flags as commonFlags } from '../../utils/flags';
import { getInputsFromSources, InputFromSourceOutput } from '../../utils/input';

interface Args {
	readonly message?: string;
	readonly publicKey: string;
	readonly signature: string;
}

const processInputs = (
	publicKey: string,
	signature: string,
	message?: string,
) => ({ data }: InputFromSourceOutput) => {
	const targetMessage = message || data;
	if (!targetMessage) {
		throw new ValidationError('No message was provided.');
	}

	return {
		verified: verifyMessageWithPublicKey({
			publicKey,
			signature,
			message: targetMessage,
		}),
	};
};

export default class VerifyCommand extends BaseCommand {
	static args = [
		{
			name: 'publicKey',
			description: 'Public key of the signer of the message.',
			required: true,
		},
		{
			name: 'signature',
			description: 'Signature to verify.',
			required: true,
		},
		{
			name: 'message',
			description: 'Message to verify.',
		},
	];

	static description = `
	Verifies a signature for a message using the signer’s public key.
	`;

	static examples = [
		'message:verify 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6 2a3ca127efcf7b2bf62ac8c3b1f5acf6997cab62ba9fde3567d188edcbacbc5dc8177fb88d03a8691ce03348f569b121bca9e7a3c43bf5c056382f35ff843c09 "Hello world"',
	];

	static flags = {
		...BaseCommand.flags,
		message: flagParser.string(commonFlags.message),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: { message: messageSource },
		} = this.parse(VerifyCommand);

		const { publicKey, signature, message }: Args = args;

		if (!message && !messageSource) {
			throw new ValidationError('No message was provided.');
		}

		const inputs = await getInputsFromSources({
			data: message ? undefined : { source: messageSource },
		});

		const result = processInputs(publicKey, signature, message)(inputs);
		this.print(result);
	}
}
