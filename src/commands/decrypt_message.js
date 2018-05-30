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

const description = `Decrypts a previously encrypted message from a given sender public key for a known nonce using your secret passphrase.

	Example: decrypt message bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0 349d300c906a113340ff0563ef14a96c092236f331ca4639 e501c538311d38d3857afefa26207408f4bf7f1228
`;

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

export const actionCreator = vorpal => async ({
	message,
	nonce,
	senderPublicKey,
	options,
}) => {
	const passphraseSource = options.passphrase;
	const messageSource = options.message;

	if (!message && !messageSource) {
		throw new ValidationError('No message was provided.');
	}

	return getInputsFromSources(vorpal, {
		passphrase: {
			source: passphraseSource,
		},
		data: message
			? null
			: {
					source: messageSource,
				},
	}).then(processInputs(nonce, senderPublicKey, message));
};

const decryptMessage = createCommand({
	command: 'decrypt message <senderPublicKey> <nonce> [message]',
	description,
	actionCreator,
	options: [commonOptions.passphrase, commonOptions.message],
	errorPrefix: 'Could not decrypt message',
});

export default decryptMessage;
