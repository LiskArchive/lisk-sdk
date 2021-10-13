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

import { ModuleEndpointContext } from '../..';
import { BaseEndpoint } from '../base_endpoint';
import { MODULE_ID_DPOS, STORE_PREFIX_DELEGATE, STORE_PREFIX_VOTER } from './constants';
import { voterStoreSchema, delegateStoreSchema } from './schemas';
import { DelegateAccount, DelegateAccountJSON, VoterData, VoterDataJSON } from './types';

export class DPoSEndpoint extends BaseEndpoint {
	public async getVoter(ctx: ModuleEndpointContext): Promise<VoterDataJSON> {
		const voterSubStore = ctx.getStore(MODULE_ID_DPOS, STORE_PREFIX_VOTER);
		const address = ctx.params.address as string;
		const voterData = await voterSubStore.getWithSchema<VoterData>(
			Buffer.from(address, 'hex'),
			voterStoreSchema,
		);
		const voterDataJSON = { sentVotes: [], pendingUnlocks: [] } as VoterDataJSON;
		voterData.sentVotes.map(sentVote =>
			voterDataJSON.sentVotes.push({
				delegateAddress: sentVote.delegateAddress.toString('hex'),
				amount: sentVote.amount.toString(),
			}),
		);
		voterData.pendingUnlocks.map(pendingUnlock =>
			voterDataJSON.pendingUnlocks.push({
				...pendingUnlock,
				delegateAddress: pendingUnlock.delegateAddress.toString('hex'),
				amount: pendingUnlock.amount.toString(),
			}),
		);

		return voterDataJSON;
	}

	public async getDelegate(ctx: ModuleEndpointContext): Promise<DelegateAccountJSON> {
		const delegateSubStore = ctx.getStore(MODULE_ID_DPOS, STORE_PREFIX_DELEGATE);
		const address = ctx.params.address as string;
		const delegate = await delegateSubStore.getWithSchema<DelegateAccount>(
			Buffer.from(address, 'hex'),
			delegateStoreSchema,
		);

		return {
			...delegate,
			totalVotesReceived: delegate.totalVotesReceived.toString(),
			selfVotes: delegate.selfVotes.toString(),
		};
	}

	public async getAllDelegates(ctx: ModuleEndpointContext): Promise<DelegateAccountJSON[]> {
		const delegateSubStore = ctx.getStore(MODULE_ID_DPOS, STORE_PREFIX_DELEGATE);
		const startBuf = Buffer.alloc(20);
		const endBuf = Buffer.alloc(20);
		endBuf.fill(255);
		const storeData = await delegateSubStore.iterate({ start: startBuf, end: endBuf });

		const response = [];
		for (const data of storeData) {
			const delegate = await delegateSubStore.getWithSchema<DelegateAccount>(
				data.key,
				delegateStoreSchema,
			);
			const delegateJSON = {
				...delegate,
				totalVotesReceived: delegate.totalVotesReceived.toString(),
				selfVotes: delegate.selfVotes.toString(),
			};
			response.push(delegateJSON);
		}

		return response;
	}
}
