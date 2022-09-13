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
import * as validator from '@liskhq/lisk-validator';
import { BaseIPCClientCommand } from '../base_ipc_client';

interface Args {
	readonly transaction: string;
}

export abstract class SendCommand extends BaseIPCClientCommand {
	static description = 'Send transaction to the local node.';

	static flags = {
		...BaseIPCClientCommand.flags,
	};

	static args = [
		{
			name: 'transaction',
			required: true,
			description: 'A transaction to be sent to the node encoded as hex string',
		},
	];

	static examples = [
		'transaction:send 080810011880cab5ee012220fd061b9146691f3c56504be051175d5b76d1b1d0179c5c4370e18534c58821222a2408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e324028edd3601cdc35a41bb23415a0d9f3c3e9cf188d9971adf18742cea39d58aa84809aa87bcfe6feaac46211c80472ad9297fd87727709f5d7e7b4134caf106b02',
	];

	async run(): Promise<void> {
		const { args } = await this.parse(SendCommand);
		const { transaction } = args as Args;
		if (!validator.isHexString(transaction)) {
			throw new Error('The transaction must be provided as a encoded hex string.');
		}
		if (!this._client) {
			this.error('APIClient is not initialized.');
		}

		const { transactionId } = await this._client.invoke<{ transactionId: string }>(
			'txpool_postTransaction',
			{ transaction },
		);
		this.log(`Transaction with id: '${transactionId}' received by node.`);
	}
}
