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
import { createCommand } from '../utils/helpers';
import getInputsFromSources from '../utils/input';
import commonOptions from '../utils/options';

const description = `Encrypts your secret passphrase under a password.

	Example: encrypt passphrase
`;

const outputPublicKeyOption = [
	'--output-public-key',
	'Includes the public key in the output. This option is provided for the convenience of node operators.',
];

const processInputs = outputPublicKey => ({ passphrase, password }) => {
	const cipherAndIv = cryptography.encryptPassphrase({ passphrase, password });
	return outputPublicKey
		? Object.assign({}, cipherAndIv, {
				publicKey: cryptography.getKeys(passphrase).publicKey,
			})
		: cipherAndIv;
};

export const actionCreator = vorpal => async ({ options }) => {
	const {
		passphrase: passphraseSource,
		password: passwordSource,
		'output-public-key': outputPublicKey,
	} = options;

	return getInputsFromSources(vorpal, {
		passphrase: {
			source: passphraseSource,
			repeatPrompt: true,
		},
		password: {
			source: passwordSource,
			repeatPrompt: true,
		},
	}).then(processInputs(outputPublicKey));
};

const encryptPassphrase = createCommand({
	command: 'encrypt passphrase',
	description,
	actionCreator,
	options: [
		outputPublicKeyOption,
		commonOptions.passphrase,
		commonOptions.password,
	],
	errorPrefix: 'Could not encrypt passphrase',
});

export default encryptPassphrase;
