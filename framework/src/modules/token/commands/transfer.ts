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
import { validator } from '@liskhq/lisk-validator';
import { BaseCommand } from '../../base_command';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { TokenMethod } from '../method';
import { transferParamsSchema } from '../schemas';

interface Params {
	tokenID: Buffer;
	amount: bigint;
	recipientAddress: Buffer;
	data: string;
}

export class TransferCommand extends BaseCommand {
	public schema = transferParamsSchema;
	private _method!: TokenMethod;

	public init(args: { method: TokenMethod }) {
		this._method = args.method;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(context: CommandVerifyContext<Params>): Promise<VerificationResult> {
		const { params } = context;

		try {
			validator.validate(transferParamsSchema, params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}
		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<Params>): Promise<void> {
		const { params } = context;
		await this._method.transfer(
			context.getMethodContext(),
			context.transaction.senderAddress,
			params.recipientAddress,
			params.tokenID,
			params.amount,
		);
	}
}
