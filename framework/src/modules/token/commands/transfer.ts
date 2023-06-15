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

import * as cryptography from '@liskhq/lisk-cryptography';
import { BaseCommand } from '../../base_command';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { TokenMethod } from '../method';
import { transferParamsSchema } from '../schemas';
import { UserStore } from '../stores/user';
import { TokenID } from '../types';
import { InternalMethod } from '../internal_method';

interface Params {
	tokenID: TokenID;
	amount: bigint;
	recipientAddress: Buffer;
	data: string;
}

export class TransferCommand extends BaseCommand {
	public schema = transferParamsSchema;
	private _method!: TokenMethod;
	private _internalMethod!: InternalMethod;

	public init(args: { method: TokenMethod; internalMethod: InternalMethod }) {
		this._method = args.method;
		this._internalMethod = args.internalMethod;
	}

	public async verify(context: CommandVerifyContext<Params>): Promise<VerificationResult> {
		const { params } = context;

		const availableBalance = await this._method.getAvailableBalance(
			context.getMethodContext(),
			context.transaction.senderAddress,
			params.tokenID,
		);
		if (availableBalance < params.amount) {
			throw new Error(
				`${cryptography.address.getLisk32AddressFromAddress(
					context.transaction.senderAddress,
				)} balance ${availableBalance.toString()} is not sufficient for ${params.amount.toString()}.`,
			);
		}
		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<Params>): Promise<void> {
		const { params } = context;

		const userStore = this.stores.get(UserStore);

		const recipientAccountKey = userStore.getKey(params.recipientAddress, params.tokenID);

		const recipientAccountExists = await userStore.has(context, recipientAccountKey);

		if (!recipientAccountExists) {
			await this._internalMethod.initializeUserAccount(
				context.getMethodContext(),
				params.recipientAddress,
				params.tokenID,
			);
		}

		await this._internalMethod.transfer(
			context.getMethodContext(),
			context.transaction.senderAddress,
			params.recipientAddress,
			params.tokenID,
			params.amount,
		);
	}
}
