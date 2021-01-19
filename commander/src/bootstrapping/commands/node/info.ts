/*
 * Copyright © 2021 Lisk Foundation
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
import { BaseIPCCommand } from '../base_ipc';

export abstract class InfoCommand extends BaseIPCCommand {
	static description = 'Get node information from a running application.';

	static examples = ['node:info', 'node:info --data-path ./lisk'];

	static flags = {
		...BaseIPCCommand.flags,
	};

	async run(): Promise<void> {
		if (!this._client) {
			this.error('APIClient is not initialized.');
		}
		try {
			const nodeInfo = await this._client.node.getNodeInfo();
			this.printJSON(nodeInfo);
		} catch (errors) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const errorMessage = Array.isArray(errors)
				? errors.map(err => (err as Error).message).join(',')
				: errors;

			this.error(errorMessage);
		}
	}
}
