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
 */

import { validator } from '@liskhq/lisk-validator';
import {
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../state_machine';
import { BaseCommand } from '../../base_command';
import { CommissionChangeEvent } from '../events/commission_change';
import { changeCommissionCommandParamsSchema } from '../schemas';
import { ValidatorStore } from '../stores/validator';
import { ChangeCommissionParams } from '../types';

export class ChangeCommissionCommand extends BaseCommand {
	public schema = changeCommissionCommandParamsSchema;

	private _commissionIncreasePeriod!: number;
	private _maxCommissionIncreaseRate!: number;

	public init(args: { commissionIncreasePeriod: number; maxCommissionIncreaseRate: number }) {
		this._commissionIncreasePeriod = args.commissionIncreasePeriod;
		this._maxCommissionIncreaseRate = args.maxCommissionIncreaseRate;
	}

	public async verify(
		context: CommandVerifyContext<ChangeCommissionParams>,
	): Promise<VerificationResult> {
		try {
			validator.validate(changeCommissionCommandParamsSchema, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}

		const validatorStore = this.stores.get(ValidatorStore);
		const validatorExists = await validatorStore.has(context, context.transaction.senderAddress);

		if (!validatorExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Transaction sender has not registered as a validator.'),
			};
		}

		const validatorData = await validatorStore.get(context, context.transaction.senderAddress);
		const oldCommission = validatorData.commission;
		const hasIncreasedCommissionRecently =
			context.header.height - validatorData.lastCommissionIncreaseHeight <
			this._commissionIncreasePeriod;

		if (context.params.newCommission >= oldCommission && hasIncreasedCommissionRecently) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					`Can only increase the commission again ${this._commissionIncreasePeriod} blocks after the last commission increase.`,
				),
			};
		}

		if (context.params.newCommission - oldCommission > this._maxCommissionIncreaseRate) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					`Invalid argument: Commission increase larger than ${this._maxCommissionIncreaseRate}.`,
				),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<ChangeCommissionParams>): Promise<void> {
		const validatorStore = this.stores.get(ValidatorStore);

		const validatorAccount = await validatorStore.get(context, context.transaction.senderAddress);
		const oldCommission = validatorAccount.commission;
		validatorAccount.commission = context.params.newCommission;

		if (validatorAccount.commission >= oldCommission) {
			validatorAccount.lastCommissionIncreaseHeight = context.header.height;
		}

		await validatorStore.set(context, context.transaction.senderAddress, validatorAccount);

		this.events.get(CommissionChangeEvent).log(context, {
			validatorAddress: context.transaction.senderAddress,
			oldCommission,
			newCommission: context.params.newCommission,
		});
	}
}
