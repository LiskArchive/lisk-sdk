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
import BaseCommand from '../../base';
import { getAPIClient } from '../../utils/api';
import { ValidationError } from '../../utils/error';
import { getStdIn } from '../../utils/input/utils';

interface Args {
	readonly signature?: string;
}

const getSignatureInput = async () => {
	try {
		const { data } = await getStdIn({ dataIsRequired: true });
		if (!data) {
			throw new ValidationError('No signature was provided.');
		}

		return data;
	} catch (e) {
		throw new ValidationError('No signature was provided.');
	}
};

export default class BroadcastCommand extends BaseCommand {
	static args = [
		{
			name: 'signature',
			description: 'Signature to broadcast.',
		},
	];

	static description = `
	Broadcasts a signature for a transaction from a multisignature account.
	Accepts a stringified JSON signature as an argument, or a signature can be piped from a previous command.
	If piping make sure to quote out the entire command chain to avoid piping-related conflicts in your shell.
	`;

	static examples = [
		'signature:broadcast \'{"transactionId":"abcd1234","publicKey":"abcd1234","signature":"abcd1234"}\'',
		'echo \'{"transactionId":"abcd1234","publicKey":"abcd1234","signature":"abcd1234"}\' | lisk signature:broadcast',
	];

	static lags = {
		...BaseCommand.flags,
	};

	async run(): Promise<void> {
		const { args } = this.parse(BroadcastCommand);
		const { signature }: Args = args;
		const signatureInput = signature || (await getSignatureInput());
		// tslint:disable-next-line no-let
		let signatureObject: object;
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
