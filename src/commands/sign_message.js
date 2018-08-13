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
import cryptography from '../utils/cryptography';
import { ValidationError } from '../utils/error';
import { createCommand } from '../utils/helpers';
import getInputsFromSources from '../utils/input';
import commonOptions from '../utils/options';

const description = `Sign a message using your secret passphrase.

	Example: sign message 'Hello world'
`;

const processInputs = message => ({ passphrase, data }) =>
	cryptography.signMessage({
		message: message || data,
		passphrase,
	});

export const actionCreator = vorpal => async ({ message, options }) => {
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
	}).then(processInputs(message));
};

const signMessage = createCommand({
	command: 'sign message [message]',
	description,
	actionCreator,
	options: [commonOptions.passphrase, commonOptions.message],
	errorPrefix: 'Could not sign message',
});

export default signMessage;
