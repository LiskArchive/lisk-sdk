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
import BaseCommand from '../../base';
import { ValidationError } from '../../utils/error';
import { getRawStdIn } from '../../utils/input/utils';
import getAPIClient from '../../utils/api';

const getSignatureInput = async () => {
	const rawStdIn = await getRawStdIn();
	if (rawStdIn.length <= 0) {
		throw new ValidationError('No signature was provided.');
	}
	return rawStdIn[0];
};

export default class BroadcastCommand extends BaseCommand {
	async run() {
		const { args: { signature } } = this.parse(BroadcastCommand);
		const signatureInput = signature || (await getSignatureInput(signature));
		let signatureObject;
		try {
			signatureObject = JSON.parse(signatureInput);
		} catch (error) {
			throw new ValidationError(
				'Could not parse signature JSON. Did you use the `--json` option?',
			);
		}
		const client = getAPIClient(this.userConfig.api);
		const response = await client.signatures.broadcast(signatureObject);
		this.print(response.data);
	}
}

BroadcastCommand.args = [
	{
		name: 'signature',
		description: 'Signature to broadcast.',
	},
];

BroadcastCommand.flags = {
	...BaseCommand.flags,
};

BroadcastCommand.description = `
Broadcasts a signature to the network via the node specified in the current config.
Accepts a stringified JSON signature as an argument, or a signature can be piped from a previous command.
If piping make sure to quote out the entire command chain to avoid piping-related conflicts in your shell.
`;

BroadcastCommand.examples = [
	'signature:broadcast \'{"transactionId":"abcd1234","publicKey":"abcd1234","signature":"abcd1234"}\'',
	'echo \'{"transactionId":"abcd1234","publicKey":"abcd1234","signature":"abcd1234"}\' | lisk signature:broadcast',
];
