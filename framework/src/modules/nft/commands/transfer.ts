/*
 * Copyright © 2023 Lisk Foundation
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

import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { BaseCommand } from '../../base_command';
import { transferParamsSchema } from '../schemas';
import { InternalMethod } from '../internal_method';

export interface TransferParams {
	nftID: Buffer;
	recipientAddress: Buffer;
	data: string;
}

export class TransferCommand extends BaseCommand {
	public schema = transferParamsSchema;
	private _internalMethod!: InternalMethod;

	public init(args: { internalMethod: InternalMethod }) {
		this._internalMethod = args.internalMethod;
	}

	public async verify(context: CommandVerifyContext<TransferParams>): Promise<VerificationResult> {
		const { params } = context;

		try {
			await this._internalMethod.verifyTransfer(
				context.getMethodContext(),
				context.transaction.senderAddress,
				params.nftID,
			);
		} catch (error) {
			return {
				status: VerifyStatus.FAIL,
				error: error as Error,
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<TransferParams>): Promise<void> {
		const { params } = context;

		await this._internalMethod.transfer(
			context.getMethodContext(),
			params.recipientAddress,
			params.nftID,
		);
	}
}
