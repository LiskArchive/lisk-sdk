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

import { math } from '@liskhq/lisk-utils';
import { ImmutableMethodContext, MethodContext } from '../../state_machine';
import { BaseMethod } from '../base_method';
import { EMPTY_KEY, MAX_LENGTH_NAME } from './constants';
import { GenesisDataStore } from './stores/genesis';
import { VoterStore, VoterData } from './stores/voter';
import { ModuleConfig, TokenMethod } from './types';
import { DelegateAccount, DelegateStore } from './stores/delegate';
import { NameStore } from './stores/name';
import { isUsername } from './utils';

export class DPoSMethod extends BaseMethod {
	private _config!: ModuleConfig;
	private _moduleName!: string;
	private _tokenMethod!: TokenMethod;

	public init(moduleName: string, config: ModuleConfig, tokenMethod: TokenMethod) {
		this._moduleName = moduleName;
		this._config = config;
		this._tokenMethod = tokenMethod;
	}
	public async isNameAvailable(
		methodContext: ImmutableMethodContext,
		name: string,
	): Promise<boolean> {
		const nameSubStore = this.stores.get(NameStore);
		if (name.length > MAX_LENGTH_NAME || name.length < 1 || !isUsername(name)) {
			return false;
		}

		const isRegistered = await nameSubStore.has(methodContext, Buffer.from(name));
		if (isRegistered) {
			return false;
		}

		return true;
	}

	public async getVoter(
		methodContext: ImmutableMethodContext,
		address: Buffer,
	): Promise<VoterData> {
		const voterSubStore = this.stores.get(VoterStore);
		const voterData = await voterSubStore.get(methodContext, address);

		return voterData;
	}

	public async getDelegate(
		methodContext: ImmutableMethodContext,
		address: Buffer,
	): Promise<DelegateAccount> {
		const delegateSubStore = this.stores.get(DelegateStore);
		const delegate = await delegateSubStore.get(methodContext, address);

		return delegate;
	}

	public getRoundLength(_methodContext: ImmutableMethodContext): number {
		return this._config.roundLength;
	}

	public getNumberOfActiveDelegates(_methodContext: ImmutableMethodContext): number {
		return this._config.numberActiveDelegates;
	}

	public async updateSharedRewards(
		context: MethodContext,
		generatorAddress: Buffer,
		tokenID: Buffer,
		reward: bigint,
	): Promise<void> {
		const delegateStore = this.stores.get(DelegateStore);
		const delegate = await delegateStore.get(context, generatorAddress);
		if (delegate.totalVotesReceived === BigInt(0)) {
			return;
		}

		const { q96 } = math;
		const rewardQ = q96(reward);
		const commissionQ = q96(BigInt(delegate.commission));
		const rewardFractionQ = q96(BigInt(1)).sub(commissionQ.div(q96(BigInt(10000))));
		const selfVotesQ = q96(delegate.selfVotes);
		const totalVotesQ = q96(delegate.totalVotesReceived);

		let hasItem = false;
		for (const item of delegate.sharingCoefficients) {
			if (item.tokenID.equals(tokenID)) {
				hasItem = true;
				break;
			}
		}
		if (!hasItem) {
			delegate.sharingCoefficients.push({ tokenID, coefficient: q96(BigInt(0)).toBuffer() });
		}

		delegate.sharingCoefficients.sort((a, b) => a.tokenID.compare(b.tokenID));

		const index = delegate.sharingCoefficients.findIndex(s => s.tokenID.equals(tokenID));
		const oldSharingCoefficient = q96(delegate.sharingCoefficients[index].coefficient);
		const sharingCoefficientIncrease = rewardQ.muldiv(rewardFractionQ, totalVotesQ);
		const sharedRewards = sharingCoefficientIncrease.mul(totalVotesQ.sub(selfVotesQ)).floor();

		await this._tokenMethod.lock(
			context,
			generatorAddress,
			this._moduleName,
			tokenID,
			sharedRewards,
		);

		const newSharingCoefficient = oldSharingCoefficient.add(sharingCoefficientIncrease);
		delegate.sharingCoefficients[index].coefficient = newSharingCoefficient.toBuffer();
		await delegateStore.set(context, generatorAddress, delegate);
	}

	public async isEndOfRound(
		methodContext: ImmutableMethodContext,
		height: number,
	): Promise<boolean> {
		const { height: genesisHeight } = await this.stores
			.get(GenesisDataStore)
			.get(methodContext, EMPTY_KEY);
		return (height - genesisHeight) % this._config.roundLength === 0;
	}
}
