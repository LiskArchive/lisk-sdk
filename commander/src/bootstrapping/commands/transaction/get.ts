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
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { BaseIPCClientCommand } from '../base_ipc_client';

interface Args {
	readonly id: string;
}

export abstract class GetCommand extends BaseIPCClientCommand {
	static description = 'Get transaction from local node by ID.';

	static args = [
		{
			name: 'id',
			required: true,
			description: 'Transaction ID in hex format.',
		},
	];

	static examples = [
		'transaction:get eab06c6a22e88bca7150e0347a7d976acd070cb9284423e6eabecd657acc1263',
	];

	static flags = {
		...BaseIPCClientCommand.flags,
	};

	async run(): Promise<void> {
		const { args } = await this.parse(GetCommand);
		const { id: transactionId } = args as Args;
		if (!this._client) {
			this.error('APIClient is not initialized.');
		}

		try {
			const transaction = await this._client.transaction.get(Buffer.from(transactionId, 'hex'));
			this.printJSON(this._client.transaction.toJSON(transaction));
		} catch (errors) {
			const errorMessage = Array.isArray(errors)
				? errors.map(err => (err as Error).message).join(',')
				: errors;

			if (/^Specified key transactions:id:(.*)does not exist/.test((errors as Error).message)) {
				this.error(`Transaction with id '${transactionId}' was not found.`);
			} else {
				this.error(errorMessage as string);
			}
		}
	}
}
