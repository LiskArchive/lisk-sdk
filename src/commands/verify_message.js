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
import cryptography from '../utils/cryptography';
import { ValidationError } from '../utils/error';
import { createCommand } from '../utils/helpers';
import getInputsFromSources from '../utils/input';
import commonOptions from '../utils/options';

const description = `Verify a message using the public key, the signature and the message.

	Example: verify message 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6 2a3ca127efcf7b2bf62ac8c3b1f5acf6997cab62ba9fde3567d188edcbacbc5dc8177fb88d03a8691ce03348f569b121bca9e7a3c43bf5c056382f35ff843c09 'Hello world'
`;

const processInputs = (publicKey, signature, message) => ({ data }) =>
	cryptography.verifyMessage({
		publicKey,
		signature,
		message: message || data,
	});

export const actionCreator = vorpal => async ({
	publicKey,
	signature,
	message,
	options,
}) => {
	const messageSource = options.message;

	if (!publicKey) {
		throw new ValidationError('No public key was provided.');
	}

	if (!signature) {
		throw new ValidationError('No signature was provided.');
	}

	if (!message && !messageSource) {
		throw new ValidationError('No message was provided.');
	}

	return getInputsFromSources(vorpal, {
		data: message ? null : { source: messageSource },
	}).then(processInputs(publicKey, signature, message));
};

const verifyMessage = createCommand({
	command: 'verify message <publicKey> <signature> [message]',
	description,
	actionCreator,
	options: [commonOptions.message],
	errorPrefix: 'Could not verify message',
});

export default verifyMessage;
