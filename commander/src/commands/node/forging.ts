/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import { APIClient } from '@liskhq/lisk-api-client';
import * as transactions from '@liskhq/lisk-transactions';
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import { getAPIClient } from '../../utils/api';
import { ValidationError } from '../../utils/error';
import { flags as commonFlags } from '../../utils/flags';
import { getInputsFromSources } from '../../utils/input';

interface Args {
	readonly publicKey: string;
	readonly status: string;
}

const STATUS_ENABLE = 'enable';
const STATUS_DISABLE = 'disable';

const processInput = async (
	client: APIClient,
	status: string,
	publicKey: string,
	password?: string,
): Promise<unknown> => {
	if (!password) {
		throw new ValidationError('No password was provided.');
	}

	return client.node
		.updateForgingStatus({
			password,
			publicKey,
			forging: status === STATUS_ENABLE,
		})
		.then(response => response.data);
};

export default class ForgingCommand extends BaseCommand {
	static args = [
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

	static description = `Update the forging status of a Lisk Core instance.`;

	static examples = [
		'node:forging enable 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6',
		'node:forging disable 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6',
	];

	static flags = {
		...BaseCommand.flags,
		password: flagParser.string(commonFlags.password),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: { password: passwordSource },
		} = this.parse(ForgingCommand);

		const { status, publicKey }: Args = args;
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
