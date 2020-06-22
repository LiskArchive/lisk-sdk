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
import { DelegatesList, getForgerAddressesForRound } from './delegates_list';
import { generateRandomSeeds } from './random_seed';
import { Rounds } from './rounds';
import { BlockHeader, Chain, DPoSProcessingOptions, StateStore } from './types';

// eslint-disable-next-line new-cap
const debug = Debug('lisk:dpos:delegate_info');

interface DelegatesInfoConstructor {
	readonly chain: Chain;
	readonly rounds: Rounds;
	readonly events: EventEmitter;
	readonly delegatesList: DelegatesList;
}

const _isGenesisBlock = (header: BlockHeader): boolean => header.height === 1;
const zeroRandomSeed = Buffer.from('00000000000000000000000000000000', 'hex');
const maxConsecutiveMissedBlocks = 50;
const maxLastForgedHeightDiff = 260000;

export class DelegatesInfo {
	private readonly chain: Chain;
	private readonly rounds: Rounds;
	private readonly events: EventEmitter;
	private readonly delegatesList: DelegatesList;

	public constructor({
		rounds,
		chain,
		events,
		delegatesList,
	}: DelegatesInfoConstructor) {
		this.chain = chain;
		this.rounds = rounds;
		this.events = events;
		this.delegatesList = delegatesList;
	}

	public async apply(
		header: BlockHeader,
		stateStore: StateStore,
		{ delegateListRoundOffset }: DPoSProcessingOptions,
	): Promise<boolean> {
		return this._update(header, stateStore, { delegateListRoundOffset });
	}

	private async _update(
		block: BlockHeader,
		stateStore: StateStore,
		{ delegateListRoundOffset }: DPoSProcessingOptions,
	): Promise<boolean> {
		if (_isGenesisBlock(block)) {
			const initialRound = 1;
			for (
				let i = initialRound;
				i <= initialRound + delegateListRoundOffset;
				i += 1
			) {
				// Height is 1, but to create round 1-3, round offset should start from 0 - 2
				await this.delegatesList.createVoteWeightsSnapshot(
					1,
					stateStore,
					i - 1,
				);
			}
			await this.delegatesList.updateForgersList(
				initialRound,
				[zeroRandomSeed, zeroRandomSeed],
				stateStore,
			);

			return false;
		}

		const round = this.rounds.calcRound(block.height);
		// Safety measure is calculated every block
		await this._updateProductivity(block, stateStore);

		// Below event should only happen at the end of the round
		if (!this._isLastBlockOfTheRound(block)) {
			return false;
		}

		const nextRound = round + 1;
		this.events.emit(EVENT_ROUND_CHANGED, {
			oldRound: round,
			newRound: nextRound,
		});
		debug('Creating delegate list for', round + delegateListRoundOffset);
		// Creating voteWeight snapshot for next round + offset
		await this.delegatesList.createVoteWeightsSnapshot(
			block.height + 1,
			stateStore,
		);

		const [randomSeed1, randomSeed2] = generateRandomSeeds(
			round,
			this.rounds,
			stateStore.consensus.lastBlockHeaders,
		);

		await this.delegatesList.updateForgersList(
			nextRound,
			[randomSeed1, randomSeed2],
			stateStore,
		);

		return true;
	}

	private async _updateProductivity(
		blockHeader: BlockHeader,
		stateStore: StateStore,
	): Promise<void> {
		const round = this.rounds.calcRound(blockHeader.height);
		debug('Calculating missed block', round);

		const expectedForgingAddresses = await getForgerAddressesForRound(
			round,
			stateStore,
		);

		const [lastBlock] = stateStore.consensus.lastBlockHeaders;
		const missedBlocks =
			Math.ceil(
				(blockHeader.timestamp - lastBlock.timestamp) /
					this.chain.slots.blockTime(),
			) - 1;
		const forgerAddress = getAddressFromPublicKey(
			blockHeader.generatorPublicKey,
		);
		const forgerIndex = expectedForgingAddresses.findIndex(address =>
			address.equals(forgerAddress),
		);
		// Update consecutive missed block
		for (let i = 0; i < missedBlocks; i += 1) {
			const rawIndex = (forgerIndex - 1 - i) % expectedForgingAddresses.length;
			const index =
				rawIndex >= 0 ? rawIndex : rawIndex + expectedForgingAddresses.length;
			const missedForgerAddress = expectedForgingAddresses[index];
			const missedForger = await stateStore.account.get(missedForgerAddress);
			missedForger.asset.delegate.consecutiveMissedBlocks += 1;
			// Ban the missed forger if both consecutive missed block and last forged blcok diff condition are met
			if (
				missedForger.asset.delegate.consecutiveMissedBlocks >
					maxConsecutiveMissedBlocks &&
				blockHeader.height - missedForger.asset.delegate.lastForgedHeight >
					maxLastForgedHeightDiff
			) {
				missedForger.asset.delegate.isBanned = true;
			}
			stateStore.account.set(missedForgerAddress, missedForger);
		}
		// Reset consecutive missed block
		const forger = await stateStore.account.get(forgerAddress);
		forger.asset.delegate.consecutiveMissedBlocks = 0;
		forger.asset.delegate.lastForgedHeight = blockHeader.height;
		stateStore.account.set(forgerAddress, forger);
	}

	private _isLastBlockOfTheRound(block: BlockHeader): boolean {
		const round = this.rounds.calcRound(block.height);
		const nextRound = this.rounds.calcRound(block.height + 1);

		return round < nextRound;
	}
}
