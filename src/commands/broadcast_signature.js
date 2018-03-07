/*
 * LiskHQ/lisk-commander
 * Copyright © 2017 Lisk Foundation
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
import getAPIClient from '../utils/api';
import { ValidationError } from '../utils/error';
import { createCommand } from '../utils/helpers';

const description = `Broadcasts a signature to the network via the node
specified in the current config. Accepts a stringified JSON signature as an
argument, or a signature can be piped from a previous command. If piping in
non-interactive mode make sure to quote out the entire command chain to avoid
piping-related conflicts in your shell.

	Examples:
	- Interactive mode:
		- broadcast signature '{"transactionId":"abcd1234","publicKey":"abcd1234","signature":"abcd1234"}'
		- sign transaction '{"type":0,"amount":"100",...}' --json | broadcast signature
	- Non-interactive mode:
		- lisky "sign transaction '{"type":0,"amount":"100",...}' --json | broadcast signature"
`;

const getSignatureInput = ({ signature, stdin, shouldUseStdIn }) => {
	const hasStdIn = stdin && stdin[0];
	if (shouldUseStdIn && !hasStdIn) {
		throw new ValidationError('No signature was provided.');
	}
	return shouldUseStdIn ? stdin[0] : signature;
};

export const actionCreator = () => async ({ signature, stdin }) => {
	const shouldUseStdIn = !signature;
	const signatureInput = getSignatureInput({
		signature,
		stdin,
		shouldUseStdIn,
	});

	let signatureObject;
	try {
		signatureObject = JSON.parse(signatureInput);
	} catch (error) {
		throw new ValidationError(
			'Could not parse signature JSON. Did you use the `--json` option?',
		);
	}
	return signatureObject.error
		? signatureObject
		: getAPIClient().signatures.broadcast(signatureObject);
};

const broadcastSignature = createCommand({
	command: 'broadcast signature [signature]',
	description,
	actionCreator,
	errorPrefix: 'Could not broadcast signature',
});

export default broadcastSignature;
