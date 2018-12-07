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
import { flags as flagParser } from '@oclif/command';
import * as transactions from '@liskhq/lisk-transactions';
import BaseCommand from '../../base';
import { flags as commonFlags } from '../../utils/flags';
import { getAPIClient } from '../../utils/api';
import { getInputsFromSources } from '../../utils/input';

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

export default class ForgingCommand extends BaseCommand {
	async run() {
		const {
			args: { status, publicKey },
			flags: { password: passwordSource },
		} = this.parse(ForgingCommand);

		transactions.utils.validatePublicKey(publicKey);

		const client = getAPIClient(this.userConfig.api);
		const { password } = await getInputsFromSources({
			password: {
				source: passwordSource,
			},
		});
		const result = await processInput(client, status, publicKey, password);

		this.print(result);
	}
}

ForgingCommand.args = [
	{
		name: 'status',
		options: [STATUS_ENABLE, STATUS_DISABLE],
		description: 'Desired forging status.',
		required: true,
	},
	{
		name: 'publicKey',
		description: 'Public key of the delegate whose status should be updated.',
		required: true,
	},
];

ForgingCommand.flags = {
	...BaseCommand.flags,
	password: flagParser.string(commonFlags.password),
};

ForgingCommand.description = `
Updates the forging status of a node.
`;

ForgingCommand.examples = [
	'node:forging enable 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6',
	'node:forging disable 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6',
];
