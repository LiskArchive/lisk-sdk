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
import elements from 'lisk-elements';
import getInputsFromSources from '../utils/input';
import { ValidationError } from '../utils/error';
import getAPIClient from '../utils/api';
import { createCommand } from '../utils/helpers';
import commonOptions from '../utils/options';

const description = `Update forging status of the node

Example:
update forging status enable 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6
update forging status disable 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6
`;

const ACTION_ENABLE = 'enable';
const ACTION_DISABLE = 'disable';
const ERROR_PUBLIC_KEY = 'Public key must be a hex string with 64 characters';

const toggleForging = (client, publicKey, passphrase) =>
	client.node.updateForgingStatus({
		password: passphrase,
		publicKey,
	});

const processInput = (client, action, publicKey, passphrase) =>
	client.node.getForgingStatus().then(res => {
		const delegate = res.data.find(key => key.publicKey === publicKey);
		if (action === ACTION_ENABLE) {
			if (delegate && delegate.forging) {
				throw new Error('The delegate is already enabled');
			}
			return toggleForging(client, publicKey, passphrase);
		}

		if (!delegate || !delegate.forging) {
			throw new Error('There is no delegate enabled');
		}
		return toggleForging(client, publicKey, passphrase);
	});

const validatePublicKey = publicKey => {
	if (!publicKey || publicKey.length !== 64) {
		throw new ValidationError(ERROR_PUBLIC_KEY);
	}
	try {
		elements.cryptography.hexToBuffer(publicKey, 'utf8');
	} catch (error) {
		throw new ValidationError(ERROR_PUBLIC_KEY);
	}
};

export const actionCreator = vorpal => async ({
	action,
	publicKey,
	options,
}) => {
	if (![ACTION_ENABLE, ACTION_DISABLE].includes(action)) {
		throw new ValidationError('Action must be either enable or disable');
	}
	validatePublicKey(publicKey);

	const { passphrase: passphraseSource } = options;
	const client = getAPIClient();
	return getInputsFromSources(vorpal, {
		passphrase: {
			source: passphraseSource,
			repeatPrompt: true,
		},
	}).then(({ passphrase }) =>
		processInput(client, action, publicKey, passphrase),
	);
};

const updateForgingStatus = createCommand({
	command: 'update forging status [action] [publicKey]',
	description,
	actionCreator,
	options: [commonOptions.passphrase],
	errorPrefix: 'Could not update forging status',
});

export default updateForgingStatus;
