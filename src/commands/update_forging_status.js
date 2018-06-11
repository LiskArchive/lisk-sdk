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
import transactions from '../utils/transactions';
import getInputsFromSources from '../utils/input';
import { ValidationError } from '../utils/error';
import getAPIClient from '../utils/api';
import { createCommand } from '../utils/helpers';
import commonOptions from '../utils/options';

const description = `Updates the forging status of a node.

	Examples:
	- update forging status enable 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6
	- update forging status disable 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6
`;

const STATUS_ENABLE = 'enable';
const STATUS_DISABLE = 'disable';

const processInput = (client, status, publicKey, password) =>
	client.node
		.updateForgingStatus({
			password,
			publicKey,
			forging: status === STATUS_ENABLE,
		})
		.then(response => response.data);

export const actionCreator = vorpal => async ({
	status,
	publicKey,
	options,
}) => {
	if (![STATUS_ENABLE, STATUS_DISABLE].includes(status)) {
		throw new ValidationError('Status must be either enable or disable.');
	}
	transactions.utils.validatePublicKey(publicKey);

	const { password: passwordSource } = options;
	const client = getAPIClient();
	return getInputsFromSources(vorpal, {
		password: {
			source: passwordSource,
			repeatPrompt: true,
		},
	}).then(({ password }) => processInput(client, status, publicKey, password));
};

const updateForgingStatus = createCommand({
	command: 'update forging status <status> <publicKey>',
	description,
	actionCreator,
	options: [commonOptions.password],
	errorPrefix: 'Could not update forging status',
});

export default updateForgingStatus;
