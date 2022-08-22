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
import { BaseIPCClientCommand } from '../base_ipc_client';

export interface GetStatusResponse {
	status: {
		address: string;
		height: number;
		maxHeightPrevoted: number;
		maxHeightGenerated: number;
		enabled: boolean;
	}[];
}

export abstract class StatusCommand extends BaseIPCClientCommand {
	static description = 'Get forging information for the locally running node.';

	static examples = ['generator:status', 'generator:status --data-path ./sample --pretty'];

	static flags = {
		...BaseIPCClientCommand.flags,
	};

	async run(): Promise<void> {
		if (!this._client) {
			this.error('APIClient is not initialized.');
		}
		const info = await this._client.invoke<GetStatusResponse>('generator_getStatus');
		this.printJSON({ info });
	}
}
