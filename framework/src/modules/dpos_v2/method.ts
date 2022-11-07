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

import { ImmutableMethodContext, MethodContext } from '../../state_machine';
import { BaseMethod } from '../base_method';
import { EMPTY_KEY, MAX_LENGTH_NAME } from './constants';
import { DelegateStore } from './stores/delegate';
import { GenesisDataStore } from './stores/genesis';
import { NameStore } from './stores/name';
import { VoterStore } from './stores/voter';
import { DelegateAccount, ModuleConfig, VoterData } from './types';
import { isUsername } from './utils';

export class DPoSMethod extends BaseMethod {
	private _config!: ModuleConfig;

	public init(config: ModuleConfig) {
		this._config = config;
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
		_methodContext: MethodContext,
		_generatorAddress: Buffer,
		_tokenID: Buffer,
		_reward: bigint,
	): Promise<void> {
		// TODO: Implement #7715
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
