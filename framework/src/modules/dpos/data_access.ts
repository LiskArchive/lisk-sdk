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

import { codec } from '@liskhq/lisk-codec';
import { StateStore } from '../../types';
import {
	DecodedVoteWeights,
	DelegatePersistedUsernames,
	RegisteredDelegates,
	VoteWeights,
} from './types';
import { CHAIN_STATE_DELEGATE_USERNAMES, CHAIN_STATE_DELEGATE_VOTE_WEIGHTS } from './constants';
import { delegatesUserNamesSchema, voteWeightsSchema } from './schema';

export const getRegisteredDelegates = async (
	store: StateStore,
): Promise<DelegatePersistedUsernames> => {
	const usernamesBuffer = await store.chain.get(CHAIN_STATE_DELEGATE_USERNAMES);
	if (!usernamesBuffer) {
		return { registeredDelegates: [] };
	}
	const parsedUsernames = codec.decode<RegisteredDelegates>(
		delegatesUserNamesSchema,
		usernamesBuffer,
	);

	return parsedUsernames;
};

export const setRegisteredDelegates = (
	store: StateStore,
	usernames: DelegatePersistedUsernames,
): void => {
	usernames.registeredDelegates.sort((a, b) => a.address.compare(b.address));

	store.chain.set(
		CHAIN_STATE_DELEGATE_USERNAMES,
		codec.encode(delegatesUserNamesSchema, usernames),
	);
};

export const getVoteWeights = async (stateStore: StateStore): Promise<VoteWeights> => {
	const voteWeights = await stateStore.chain.get(CHAIN_STATE_DELEGATE_VOTE_WEIGHTS);
	if (!voteWeights) {
		return [];
	}

	const voteWeightsDecoded = codec.decode<DecodedVoteWeights>(voteWeightsSchema, voteWeights);
	return voteWeightsDecoded.voteWeights;
};

export const setVoteWeights = (stateStore: StateStore, voteWeights: VoteWeights): void => {
	stateStore.chain.set(
		CHAIN_STATE_DELEGATE_VOTE_WEIGHTS,
		codec.encode(voteWeightsSchema, { voteWeights }),
	);
};

export const deleteVoteWeightsUntilRound = async (
	round: number,
	stateStore: StateStore,
): Promise<void> => {
	const voteWeights = await getVoteWeights(stateStore);
	const newVoteWeights = voteWeights.filter(vw => vw.round >= round);
	setVoteWeights(stateStore, newVoteWeights);
};
