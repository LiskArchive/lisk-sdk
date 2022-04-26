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
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { BaseCommand } from '../../base_command';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../node/state_machine';
import { TokenAPI } from '../api';
import { transferParamsSchema } from '../schemas';
import { COMMAND_ID_TRANSFER } from '../constants';

interface Params {
	tokenID: Buffer;
	amount: bigint;
	recipientAddress: Buffer;
	data: string;
}

export class TransferCommand extends BaseCommand {
	public name = 'transfer';
	public id = COMMAND_ID_TRANSFER;
	public schema = transferParamsSchema;
	private _api!: TokenAPI;

	public init(args: { api: TokenAPI }) {
		this._api = args.api;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(context: CommandVerifyContext<Params>): Promise<VerificationResult> {
		const { params } = context;
		const errors = validator.validate(transferParamsSchema, params);
		if (errors.length) {
			return {
				status: VerifyStatus.FAIL,
				error: new LiskValidationError(errors),
			};
		}
		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<Params>): Promise<void> {
		const { params } = context;
		await this._api.transfer(
			context.getAPIContext(),
			context.transaction.senderAddress,
			params.recipientAddress,
			params.tokenID,
			params.amount,
		);
	}
}
