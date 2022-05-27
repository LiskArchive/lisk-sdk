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
import { crossChainTransferParams } from '../schemas';
import { CROSS_CHAIN_COMMAND_ID_TRANSFER } from '../constants';

interface Params {
	tokenID: Buffer;
	amount: bigint;
	receivingChainID: Buffer;
	recipientAddress: Buffer;
	data: string;
	messageFee: bigint;
}

export class CCTransferCommand extends BaseCommand {
	public name = 'crossChaintransfer';
	public id = CROSS_CHAIN_COMMAND_ID_TRANSFER;
	public schema = crossChainTransferParams;
	private _api!: TokenAPI;

	public init(args: { api: TokenAPI }) {
		this._api = args.api;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(context: CommandVerifyContext<Params>): Promise<VerificationResult> {
		const { params } = context;
		const errors = validator.validate(this.schema, params);
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
		const {
			params,
			transaction: { senderAddress },
		} = context;
		await this._api.transferCrossChain(
			context.getAPIContext(),
			senderAddress,
			params.receivingChainID,
			params.recipientAddress,
			params.tokenID,
			params.amount,
			params.messageFee,
			params.data,
		);
	}
}
