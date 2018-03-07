/*
 * LiskHQ/lisk-commander
 * Copyright © 2016–2018 Lisk Foundation
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

const description = `Encrypts a message for a given recipient public key using your secret passphrase.

	Example: encrypt message bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0 'Hello world'
`;

const processInputs = (recipient, message) => ({ passphrase, data }) =>
	cryptography.encryptMessage({
		message: message || data,
		passphrase,
		recipient,
	});

export const actionCreator = vorpal => async ({
	recipient,
	message,
	options,
}) => {
	const messageSource = options.message;
	const passphraseSource = options.passphrase;

	if (!message && !messageSource) {
		throw new ValidationError('No message was provided.');
	}

	return getInputsFromSources(vorpal, {
		passphrase: {
			source: passphraseSource,
			repeatPrompt: true,
		},
		data: message
			? null
			: {
					source: messageSource,
				},
	}).then(processInputs(recipient, message));
};

const encryptMessage = createCommand({
	command: 'encrypt message <recipient> [message]',
	description,
	actionCreator,
	options: [commonOptions.passphrase, commonOptions.message],
	errorPrefix: 'Could not encrypt message',
});

export default encryptMessage;
