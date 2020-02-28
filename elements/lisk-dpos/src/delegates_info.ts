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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import * as Debug from 'debug';
import { EventEmitter } from 'events';

import { EVENT_ROUND_CHANGED } from './constants';
import {
	DelegatesList,
	deleteDelegateListAfterRound,
	getForgerPublicKeysForRound,
} from './delegates_list';
import { Rounds } from './rounds';
import {
	Block,
	BlockHeader,
	Chain,
	DPoSProcessingOptions,
	StateStore,
} from './types';

const debug = Debug('lisk:dpos:delegate_info');

interface DelegatesInfoConstructor {
	readonly chain: Chain;
	readonly rounds: Rounds;
	readonly activeDelegates: number;
	readonly events: EventEmitter;
	readonly delegatesList: DelegatesList;
}

const _isGenesisBlock = (block: BlockHeader) => block.height === 1;

export class DelegatesInfo {
	private readonly chain: Chain;
	private readonly rounds: Rounds;
	private readonly activeDelegates: number;
	private readonly events: EventEmitter;
	private readonly delegatesList: DelegatesList;

	public constructor({
		rounds,
		chain,
		activeDelegates,
		events,
		delegatesList,
	}: DelegatesInfoConstructor) {
		this.chain = chain;
		this.rounds = rounds;
		this.activeDelegates = activeDelegates;
		this.events = events;
		this.delegatesList = delegatesList;
	}

	public async apply(
		block: Block,
		stateStore: StateStore,
		{ delegateListRoundOffset }: DPoSProcessingOptions,
	): Promise<boolean> {
		const undo = false;

		return this._update(block, stateStore, { undo, delegateListRoundOffset });
	}

	public async undo(
		block: Block,
		stateStore: StateStore,
		{ delegateListRoundOffset }: DPoSProcessingOptions,
	): Promise<boolean> {
		const undo = true;

		// Never undo genesis block
		if (_isGenesisBlock(block)) {
			throw new Error('Cannot undo genesis block');
		}

		return this._update(block, stateStore, { undo, delegateListRoundOffset });
	}

	private async _update(
		block: Block,
		stateStore: StateStore,
		{ delegateListRoundOffset, undo }: DPoSProcessingOptions,
	): Promise<boolean> {
		if (_isGenesisBlock(block)) {
			const intialRound = 1;
			for (
				// tslint:disable-next-line no-let
				let i = intialRound;
				i <= intialRound + delegateListRoundOffset;
				i += 1
			) {
				await this.delegatesList.createRoundDelegateList(i, stateStore);
			}

			return false;
		}

		const round = this.rounds.calcRound(block.height);
		// Now rewards and fees are distributed every block. Assuming the distrubution is already done
		await this._updateVotedDelegatesVoteWeight(block, stateStore, undo);

		// Below event should only happen at the end of the round
		if (!this._isLastBlockOfTheRound(block)) {
			return false;
		}

		// Perform updates that only happens in the end of the round
		await this._updateMissedBlocks(block, stateStore, undo);

		if (undo) {
			const previousRound = round + 1;
			this.events.emit(EVENT_ROUND_CHANGED, {
				oldRound: previousRound,
				newRound: round,
			});
			debug('Deleting delegate list after ', round + delegateListRoundOffset);
			await deleteDelegateListAfterRound(
				round + delegateListRoundOffset,
				stateStore,
			);
		} else {
			const nextRound = round + 1;
			this.events.emit(EVENT_ROUND_CHANGED, {
				oldRound: round,
				newRound: nextRound,
			});
			debug('Creating delegate list for', round + delegateListRoundOffset);
			await this.delegatesList.createRoundDelegateList(
				nextRound + delegateListRoundOffset,
				stateStore,
			);
		}

		return true;
	}

	private async _updateMissedBlocks(
		blockHeader: BlockHeader,
		stateStore: StateStore,
		undo?: boolean,
	): Promise<void> {
		const round = this.rounds.calcRound(blockHeader.height);
		debug('Calculating missed block', round);

		const expectedForgingPublicKeys = await getForgerPublicKeysForRound(
			round,
			stateStore,
		);

		const heightFrom = this.rounds.calcRoundStartHeight(round);
		const heightTo = this.rounds.calcRoundEndHeight(round) - 1;

		const blocksInRounds = await this.chain.dataAccess.getBlockHeadersByHeightBetween(
			heightFrom,
			heightTo,
		);

		// The blocksInRounds does not contain the last block
		blocksInRounds.push(blockHeader);

		if (blocksInRounds.length !== this.activeDelegates) {
			throw new Error(
				'Fetched blocks do not match the size of the active delegates',
			);
		}

		const forgedPublicKeys = blocksInRounds.map(
			block => block.generatorPublicKey,
		);

		const missedBlocksDelegatePublicKeys = expectedForgingPublicKeys.filter(
			expectedPublicKey =>
				!forgedPublicKeys.find(publicKey => publicKey === expectedPublicKey),
		);

		if (!missedBlocksDelegatePublicKeys.length) {
			return;
		}

		for (const publicKey of missedBlocksDelegatePublicKeys) {
			const address = getAddressFromPublicKey(publicKey);
			const account = await stateStore.account.get(address);
			account.missedBlocks += undo ? -1 : 1;
			stateStore.account.set(address, account);
		}
	}

	private async _updateVotedDelegatesVoteWeight(
		block: Block,
		stateStore: StateStore,
		undo?: boolean,
	): Promise<void> {
		const generator = await stateStore.account.get(
			getAddressFromPublicKey(block.generatorPublicKey),
		);
		if (!generator.votedDelegatesPublicKeys.length) {
			return;
		}
		for (const votedDelegatesPublicKey of generator.votedDelegatesPublicKeys) {
			const delegate = await stateStore.account.get(
				getAddressFromPublicKey(votedDelegatesPublicKey),
			);
			const { totalEarning } = this.chain.getTotalEarningAndBurnt(block);
			if (!undo) {
				delegate.voteWeight += totalEarning;
			} else {
				delegate.voteWeight -= totalEarning;
			}
			stateStore.account.set(delegate.address, delegate);
		}
	}

	private _isLastBlockOfTheRound(block: BlockHeader): boolean {
		const round = this.rounds.calcRound(block.height);
		const nextRound = this.rounds.calcRound(block.height + 1);

		return round < nextRound;
	}
}
