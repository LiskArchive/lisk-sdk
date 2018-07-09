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
import getInputsFromSources from '../utils/input';
import { createCommand } from '../utils/helpers';
import commonOptions from '../utils/options';
import cryptography from '../utils/cryptography';

const description = `Shows account information for a given passphrase.

	Example: show account
`;

const processInput = ({ passphrase }) => {
	const { privateKey, publicKey } = cryptography.getKeys(passphrase);
	const { address } = cryptography.getAddressFromPublicKey(publicKey);
	return {
		privateKey,
		publicKey,
		address,
	};
};

export const actionCreator = vorpal => async ({ options }) => {
	const { passphrase: passphraseSource } = options;

	return getInputsFromSources(vorpal, {
		passphrase: {
			source: passphraseSource,
			repeatPrompt: true,
		},
	}).then(processInput);
};

const showAccount = createCommand({
	command: 'show account',
	description,
	actionCreator,
	options: [commonOptions.passphrase],
	errorPrefix: 'Could not show account',
});

export default showAccount;
