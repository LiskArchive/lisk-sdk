/*
 * Copyright © 2022 Lisk Foundation
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

import { CommandExecuteContext } from '../../../state_machine';
import { BaseCommand } from '../../base_command';
import { InternalMethod } from '../internal_method';
import { ValidatorStore } from '../stores/validator';
import { StakerStore } from '../stores/staker';

export class ClaimRewardsCommand extends BaseCommand {
	private _internalMethod!: InternalMethod;

	public addDependencies(args: { internalMethod: InternalMethod }) {
		this._internalMethod = args.internalMethod;
	}

	public async execute(context: CommandExecuteContext<Record<string, never>>): Promise<void> {
		const {
			transaction: { senderAddress },
			getMethodContext,
		} = context;

		const validatorStore = this.stores.get(ValidatorStore);
		const stakerStore = this.stores.get(StakerStore);
		const stakerData = await stakerStore.get(context, senderAddress);

		for (const sentStake of stakerData.stakes) {
			const validator = await validatorStore.get(context, sentStake.validatorAddress);
			await this._internalMethod.assignStakeRewards(
				getMethodContext(),
				senderAddress,
				sentStake,
				validator,
			);
			sentStake.sharingCoefficients = validator.sharingCoefficients;
		}

		await stakerStore.set(context, senderAddress, stakerData);
	}
}
