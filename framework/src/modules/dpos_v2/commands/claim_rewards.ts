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

import { CommandExecuteContext } from '../../../state_machine';
import { BaseCommand } from '../../base_command';
import { InternalMethod } from '../internal_method';
import { DelegateStore } from '../stores/delegate';
import { VoterStore } from '../stores/voter';

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

		const delegateStore = this.stores.get(DelegateStore);
		const delegate = await delegateStore.get(context, senderAddress);
		const voterStore = this.stores.get(VoterStore);
		const voterData = await voterStore.get(context, senderAddress);
		for (const sentVote of voterData.sentVotes) {
			await this._internalMethod.assignVoteRewards(
				getMethodContext(),
				senderAddress,
				sentVote,
				delegate,
			);
		}
	}
}
