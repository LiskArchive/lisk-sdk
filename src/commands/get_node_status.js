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
import { createCommand } from '../utils/helpers';
import getAPIClient from '../utils/api';

const description = `Gets information about a node.

	Examples:
	- get node status
	- get node status --forging
`;

const forgingDescription = `Additionally provides information about forging status

	Examples:
	- --forging
`;

export const actionCreator = () => async ({ options }) => {
	const client = getAPIClient();

	return Promise.all([client.node.getConstants(), client.node.getStatus()])
		.then(([constantsResponse, statusResponse]) =>
			Object.assign({}, constantsResponse.data, statusResponse.data),
		)
		.then(nodeStatus => {
			if (options.forging) {
				return client.node
					.getForgingStatus()
					.then(forgingResponse =>
						Object.assign({}, nodeStatus, {
							forgingStatus: forgingResponse.data,
						}),
					)
					.catch(error =>
						Object.assign({}, nodeStatus, { forgingStatus: error.message }),
					);
			}
			return nodeStatus;
		});
};

const get = createCommand({
	command: 'get node status',
	description,
	actionCreator,
	options: [['--forging', forgingDescription]],
	errorPrefix: 'Could not get node status',
});

export default get;
