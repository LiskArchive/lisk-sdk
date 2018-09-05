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
import BaseCommand from '../../base';
import getAPIClient from '../../utils/api';

export default class GetCommand extends BaseCommand {
	async run() {
		const { flags: { all } } = this.parse(GetCommand);
		const client = getAPIClient(this.userConfig.api);
		const baseInfo = await Promise.all([
			client.node.getConstants(),
			client.node.getStatus(),
		]).then(([constantsResponse, statusResponse]) =>
			Object.assign({}, constantsResponse.data, statusResponse.data),
		);
		if (!all) {
			return this.print(baseInfo);
		}
		const fullInfo = await client.node
			.getForgingStatus()
			.then(forgingResponse =>
				Object.assign({}, baseInfo, {
					forgingStatus: forgingResponse.data,
				}),
			)
			.catch(error =>
				Object.assign({}, baseInfo, { forgingStatus: error.message }),
			);
		return this.print(fullInfo);
	}
}

GetCommand.flags = {
	...BaseCommand.flags,
	all: flagParser.boolean({
		description: 'Additionally provides information about forging status.',
	}),
};

GetCommand.description = `
Gets information about a node.
`;

GetCommand.examples = ['node:get', 'node:get --all'];
