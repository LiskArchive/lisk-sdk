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
import { COMMISSION_INCREASE_PERIOD, MAX_COMMISSION_INCREASE_RATE } from '../constants';
import { CommissionChangeEvent } from '../events/commission_change';
import { changeCommissionCommandParamsSchema } from '../schemas';
import { DelegateStore } from '../stores/delegate';
import { ChangeCommissionParams } from '../types';

export class ChangeCommissionCommand extends BaseCommand {
	public schema = changeCommissionCommandParamsSchema;

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

		const delegateStore = this.stores.get(DelegateStore);
		const delegateExists = await delegateStore.has(context, context.transaction.senderAddress);

		if (!delegateExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Transaction sender has not registered as a delegate.'),
			};
		}

		const delegate = await delegateStore.get(context, context.transaction.senderAddress);
		const oldCommission = delegate.commission;
		const hasIncreasedCommissionRecently =
			context.header.height - delegate.lastCommissionIncreaseHeight < COMMISSION_INCREASE_PERIOD;

		if (context.params.newCommission > oldCommission && hasIncreasedCommissionRecently) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					`Can only increase the commission again ${COMMISSION_INCREASE_PERIOD} blocks after the last commission increase.`,
				),
			};
		}

		if (context.params.newCommission - oldCommission > MAX_COMMISSION_INCREASE_RATE) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					`Invalid argument: Commission increase larger than ${MAX_COMMISSION_INCREASE_RATE}.`,
				),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<ChangeCommissionParams>): Promise<void> {
		const delegateStore = this.stores.get(DelegateStore);

		const delegate = await delegateStore.get(context, context.transaction.senderAddress);
		const oldCommission = delegate.commission;

		delegate.commission = context.params.newCommission;
		if (delegate.commission > oldCommission) {
			delegate.lastCommissionIncreaseHeight = context.header.height;
		}

		await delegateStore.set(context, context.transaction.senderAddress, delegate);

		this.events.get(CommissionChangeEvent).log(context, {
			delegateAddress: context.transaction.senderAddress,
			oldCommission,
			newCommission: context.params.newCommission,
		});
	}
}
