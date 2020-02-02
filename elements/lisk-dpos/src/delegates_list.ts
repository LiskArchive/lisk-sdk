/*
 * Copyright © 2019 Lisk Foundation
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

import { hash } from '@liskhq/lisk-cryptography';
import * as Debug from 'debug';

import { CHAIN_STATE_FORGERS_LIST_KEY } from './constants';
import { Rounds } from './rounds';
import {
	Account,
	BlockHeader,
	Blocks,
	ForgerList,
	ForgersList,
	StateStore,
} from './types';

const debug = Debug('lisk:dpos:delegate_list');

interface DelegatesListConstructor {
	readonly rounds: Rounds;
	readonly activeDelegates: number;
	readonly blocks: Blocks;
	readonly exceptions: {
		readonly ignoreDelegateListCacheForRounds?: ReadonlyArray<number>;
	};
}

export const getForgersList = async (
	stateStore: StateStore,
): Promise<ForgersList> => {
	const forgersListStr = await stateStore.chainState.get(
		CHAIN_STATE_FORGERS_LIST_KEY,
	);
	if (!forgersListStr) {
		return [];
	}

	return JSON.parse(forgersListStr) as ForgersList;
};

const _setForgersList = (
	stateStore: StateStore,
	forgersList: ForgersList,
): void => {
	const forgersListStr = JSON.stringify(forgersList);
	stateStore.chainState.set(CHAIN_STATE_FORGERS_LIST_KEY, forgersListStr);
};

export const deleteDelegateListUntilRound = async (
	round: number,
	stateStore: StateStore,
): Promise<void> => {
	debug('Deleting list until round: ', round);
	const forgersList = await getForgersList(stateStore);
	const newForgersList = forgersList.filter(fl => fl.round >= round);
	_setForgersList(stateStore, newForgersList);
};

export const deleteDelegateListAfterRound = async (
	round: number,
	stateStore: StateStore,
): Promise<void> => {
	debug('Deleting list after round: ', round);
	const forgersList = await getForgersList(stateStore);
	const newForgersList = forgersList.filter(fl => fl.round <= round);
	_setForgersList(stateStore, newForgersList);
};

export const shuffleDelegateListForRound = (
	round: number,
	list: ReadonlyArray<string>,
): ReadonlyArray<string> => {
	const seedSource = round.toString();
	const delegateList = [...list];
	// tslint:disable-next-line:no-let
	let currentSeed = hash(seedSource, 'utf8');

	// tslint:disable-next-line one-variable-per-declaration no-let increment-decrement
	for (let i = 0, delCount = delegateList.length; i < delCount; i++) {
		// tslint:disable-next-line no-let increment-decrement no-magic-numbers
		for (let x = 0; x < 4 && i < delCount; i++, x++) {
			const newIndex = currentSeed[x] % delCount;
			const b = delegateList[newIndex];
			delegateList[newIndex] = delegateList[i];
			delegateList[i] = b;
		}
		currentSeed = hash(currentSeed);
	}

	return delegateList;
};

/**
 * Get shuffled list of active delegate public keys (forger public keys) for a specific round.
 * The list of delegates used is the one computed at the begging of the round `r - delegateListRoundOffset`
 */
export const getForgerPublicKeysForRound = async (
	round: number,
	stateStore: StateStore,
): Promise<ReadonlyArray<string>> => {
	const forgersList = await getForgersList(stateStore);
	const delegatePublicKeys = forgersList.find(fl => fl.round === round)
		?.delegates;

	if (!delegatePublicKeys) {
		throw new Error(`No delegate list found for round: ${round}`);
	}

	return shuffleDelegateListForRound(round, delegatePublicKeys);
};

export class DelegatesList {
	private readonly rounds: Rounds;
	private readonly blocks: Blocks;
	private readonly activeDelegates: number;
	private readonly exceptions: {
		readonly ignoreDelegateListCacheForRounds?: ReadonlyArray<number>;
	};

	public constructor({
		activeDelegates,
		rounds,
		blocks,
		exceptions,
	}: DelegatesListConstructor) {
		this.activeDelegates = activeDelegates;
		this.rounds = rounds;
		this.exceptions = exceptions;
		this.blocks = blocks;
	}

	/**
	 * Generate list of delegate public keys for the next round in database
	 * WARNING: This function should only be called from `apply()` as we don't allow future rounds to be created
	 */
	public async createRoundDelegateList(
		round: number,
		stateStore: StateStore,
	): Promise<void> {
		debug(`Creating delegate list for ${round}`);
		const forgersList = await getForgersList(stateStore);
		const forgerListIndex = forgersList.findIndex(fl => fl.round === round);
		// This gets the list before current block is executed
		const delegateAccounts = await this.blocks.dataAccess.getDelegateAccounts(
			this.activeDelegates,
		);
		const updatedAccounts = stateStore.account.getUpdated();
		// tslint:disable-next-line readonly-keyword
		const updatedAccountsMap: { [address: string]: Account } = {};
		// Convert updated accounts to map for better search
		for (const account of updatedAccounts) {
			updatedAccountsMap[account.address] = account;
		}
		// Inject delegate account if it doesn't exist
		for (const delegate of delegateAccounts) {
			if (updatedAccountsMap[delegate.address] === undefined) {
				updatedAccountsMap[delegate.address] = delegate;
			}
		}
		const updatedAccountArray = [...Object.values(updatedAccountsMap)];
		// Re-sort based on VoteWeight with desc and publickey with asc
		updatedAccountArray.sort((a, b) => {
			if (BigInt(b.voteWeight) > BigInt(a.voteWeight)) {
				return 1;
			}
			if (BigInt(b.voteWeight) < BigInt(a.voteWeight)) {
				return -1;
			}

			if (!a.publicKey) {
				return 0;
			}

			// In the tie break compare publicKey
			return a.publicKey.localeCompare(b.publicKey);
		});
		// Slice with X delegates
		const delegatePublicKeys = updatedAccountArray
			.slice(0, this.activeDelegates)
			.map(account => account.publicKey);

		const forgerList: ForgerList = {
			round,
			delegates: delegatePublicKeys,
		};
		if (forgerListIndex > 0) {
			forgersList[forgerListIndex] = forgerList;
		} else {
			forgersList.push(forgerList);
		}
		_setForgersList(stateStore, forgersList);
		debug(`Created delegate list for ${round} with ${forgersList.length}`);
	}

	public async verifyBlockForger(block: BlockHeader): Promise<boolean> {
		const currentSlot = this.blocks.slots.getSlotNumber(block.timestamp);
		const currentRound = this.rounds.calcRound(block.height);

		const forgersListStr = await this.blocks.dataAccess.getChainState(
			CHAIN_STATE_FORGERS_LIST_KEY,
		);
		const forgersList =
			forgersListStr !== undefined
				? (JSON.parse(forgersListStr) as ForgersList)
				: [];
		const delegatePublicKeys = forgersList.find(fl => fl.round === currentRound)
			?.delegates;

		if (!delegatePublicKeys) {
			throw new Error(`No delegate list found for round: ${currentRound}`);
		}

		const delegateList = shuffleDelegateListForRound(
			currentRound,
			delegatePublicKeys,
		);

		if (!delegateList.length) {
			throw new Error(
				`Failed to verify slot: ${currentSlot} for block ID: ${block.id} - No delegateList was found`,
			);
		}

		// Get delegate public key that was supposed to forge the block
		const expectedForgerPublicKey =
			delegateList[currentSlot % this.activeDelegates];

		// Verify if forger exists and matches the generatorPublicKey on block
		if (
			!expectedForgerPublicKey ||
			block.generatorPublicKey !== expectedForgerPublicKey
		) {
			/**
			 * Accepts any forger as valid for the rounds defined in exceptions.ignoreDelegateListCacheForRounds
			 * This is only set for testnet due to `zero vote` active delegate issue (https://github.com/LiskHQ/lisk-sdk/pull/2543#pullrequestreview-178505587)
			 * Should be tackled by https://github.com/LiskHQ/lisk-sdk/issues/4194
			 */
			const { ignoreDelegateListCacheForRounds = [] } = this.exceptions;
			if (ignoreDelegateListCacheForRounds.includes(currentRound)) {
				return true;
			}

			throw new Error(
				`Failed to verify slot: ${currentSlot}. Block ID: ${block.id}. Block Height: ${block.height}`,
			);
		}

		return true;
	}
}
