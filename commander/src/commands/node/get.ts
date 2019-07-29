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
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import { getAPIClient } from '../../utils/api';

export default class GetCommand extends BaseCommand {
	static description = `Get the network status from a Lisk Core instance.`;

	static examples = ['node:get', 'node:get --forging-status'];

	static flags = {
		...BaseCommand.flags,
		'forging-status': flagParser.boolean({
			description: 'Additionally provides information about forging status.',
		}),
	};

	async run(): Promise<void> {
		const {
			flags: { 'forging-status': showForgingStatus },
		} = this.parse(GetCommand);
		const client = getAPIClient(this.userConfig.api);
		const baseInfo = await Promise.all([
			client.node.getConstants(),
			client.node.getStatus(),
		]).then(([constantsResponse, statusResponse]) => ({
			...constantsResponse.data,
			...statusResponse.data,
		}));
		if (!showForgingStatus) {
			this.print(baseInfo);

			return;
		}
		const fullInfo = await client.node
			.getForgingStatus()
			.then(forgingResponse => ({
				...baseInfo,
				forgingStatus: forgingResponse.data || [],
			}))
			.catch(error => ({
				...baseInfo,
				forgingStatus: error.message,
			}));

		this.print(fullInfo);
	}
}
