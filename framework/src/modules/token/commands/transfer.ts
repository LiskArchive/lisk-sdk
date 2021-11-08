/*
 * Copyright © 2020 Lisk Foundation
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
 */
import { BaseCommand } from '../../base_command';
import { CommandExecuteContext } from '../../../node/state_machine';
import { TokenAPI } from '../api';

interface Params {
	amount: bigint;
	recipientAddress: Buffer;
	data: string;
}

export class TransferCommand extends BaseCommand {
	public name = 'transfer';
	public id = 0;
	public schema = {
		$id: 'lisk/transfer-params',
		title: 'Transfer transaction params',
		type: 'object',
		required: ['amount', 'recipientAddress', 'data'],
		properties: {
			amount: {
				dataType: 'uint64',
				fieldNumber: 1,
			},
			recipientAddress: {
				dataType: 'bytes',
				fieldNumber: 2,
				minLength: 20,
				maxLength: 20,
			},
			data: {
				dataType: 'string',
				fieldNumber: 3,
				minLength: 0,
				maxLength: 64,
			},
		},
	};
	private _api!: TokenAPI;

	public init(args: { api: TokenAPI }) {
		this._api = args.api;
	}

	public async execute(context: CommandExecuteContext<Params>): Promise<void> {
		const { params } = context;
		await this._api.transfer(
			context.getAPIContext(),
			context.transaction.senderAddress,
			params.recipientAddress,
			{
				chainID: 0,
				localID: 0,
			},
			params.amount,
		);
	}
}
