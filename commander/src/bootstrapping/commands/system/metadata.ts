/*
 * Copyright © 2022 Lisk Foundation
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

export abstract class MetadataCommand extends BaseIPCClientCommand {
	static description = 'Get node metadata from a running application.';

	static examples = ['system:metadata', 'system:metadata --data-path ./lisk'];

	static flags = {
		...BaseIPCClientCommand.flags,
	};

	async run(): Promise<void> {
		if (!this._client) {
			this.error('APIClient is not initialized.');
		}
		try {
			const metadataInfo = await this._client.invoke('system_getMetadata');
			this.printJSON(metadataInfo as unknown as Record<string, unknown>);
		} catch (errors) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const errorMessage = Array.isArray(errors)
				? errors.map(err => (err as Error).message).join(',')
				: errors;

			this.error(errorMessage as string);
		}
	}
}
