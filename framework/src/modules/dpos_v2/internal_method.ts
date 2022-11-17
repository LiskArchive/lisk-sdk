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

import { MethodContext } from '../../state_machine';
import { BaseMethod } from '../base_method';
import { NamedRegistry } from '../named_registry';
import { MAX_NUMBER_BYTES_Q96 } from './constants';
import { RewardsAssignedEvent } from './events/rewards_assigned';
import { VoteObject } from './stores/voter';
import { DelegateAccount, TokenMethod } from './types';
import { calculateVoteRewards } from './utils';

export class InternalMethod extends BaseMethod {
	private _tokenMethod!: TokenMethod;
	private readonly _moduleName!: string;

	public constructor(stores: NamedRegistry, events: NamedRegistry, moduleName: string) {
		super(stores, events);

		this._moduleName = moduleName;
	}
	public addDependencies(tokenMethod: TokenMethod) {
		this._tokenMethod = tokenMethod;
	}

	public async assignVoteRewards(
		methodContext: MethodContext,
		voterAddress: Buffer,
		sentVote: VoteObject,
		delegateData: DelegateAccount,
	) {
		if (sentVote.delegateAddress.equals(voterAddress)) {
			return;
		}

		for (const sharingCoefficient of delegateData.sharingCoefficients) {
			const voteSharingCoefficient = sentVote.voteSharingCoefficients.find(coefficient =>
				coefficient.tokenID.equals(sharingCoefficient.tokenID),
			) ?? {
				tokenID: sharingCoefficient.tokenID,
				coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96),
			};

			const reward = calculateVoteRewards(
				voteSharingCoefficient,
				sentVote.amount,
				sharingCoefficient,
			);

			if (reward > 0) {
				await this._tokenMethod.unlock(
					methodContext,
					sentVote.delegateAddress,
					this._moduleName,
					sharingCoefficient.tokenID,
					reward,
				);

				await this._tokenMethod.transfer(
					methodContext,
					sentVote.delegateAddress,
					voterAddress,
					sharingCoefficient.tokenID,
					reward,
				);

				this.events.get(RewardsAssignedEvent).log(methodContext, {
					voterAddress,
					delegateAddress: sentVote.delegateAddress,
					tokenID: sharingCoefficient.tokenID,
					amount: reward,
				});
			}
		}
	}
}
