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

import * as Debug from 'debug';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { objects as objectsUtils } from '@liskhq/lisk-utils';
import { Account, BlockHeader } from '@liskhq/lisk-chain';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { BaseModule } from '../base_module';
import { AfterBlockApplyInput, AfterGenesisBlockApplyInput, GenesisConfig } from '../../types';
import { Rounds } from './rounds';
import { DPOSAccountProps } from './types';
import { MAX_CONSECUTIVE_MISSED_BLOCKS, MAX_LAST_FORGED_HEIGHT_DIFF } from './constants';
import { dposAccountSchema, dposModuleParamsSchema } from './schema';
import { generateRandomSeeds } from './random_seed';
import {
	createVoteWeightsSnapshot,
	deleteVoteWeightsUntilRound,
	updateDelegateList,
} from './delegates';
import { setRegisteredDelegates } from './db';

const { bufferArrayUniqueItems, bufferArrayOrderByLex, bufferArrayContains } = objectsUtils;

// eslint-disable-next-line new-cap
const debug = Debug('dpos');

export class DPoSModule extends BaseModule {
	public name = 'dpos';
	public type = 5;
	public accountSchema = dposAccountSchema;

	public readonly rounds: Rounds;

	private readonly _activeDelegates: number;
	private readonly _standbyDelegates: number;
	private readonly _delegateListRoundOffset: number;
	private readonly _delegatesPerRound: number;
	private readonly _delegateActiveRoundLimit: number;
	private readonly _blockTime: number;
	private _finalizedHeight = 0;

	public constructor(config: GenesisConfig) {
		super(config);

		const errors = validator.validate(dposModuleParamsSchema, this.config);
		if (errors.length) {
			throw new LiskValidationError([...errors]);
		}

		this._activeDelegates = this.config.activeDelegates as number;
		this._standbyDelegates = this.config.standbyDelegates as number;
		this._delegateListRoundOffset = this.config.delegateListRoundOffset as number;
		this._delegatesPerRound = this._activeDelegates + this._standbyDelegates;
		this._blockTime = config.blockTime;
		this._delegateActiveRoundLimit = 3;

		this.rounds = new Rounds({ blocksPerRound: this._delegatesPerRound });
	}

	// eslint-disable-next-line consistent-return
	public async afterBlockApply(input: AfterBlockApplyInput): Promise<void> {
		const finalizedHeight = input.consensus.getFinalizedHeight();
		const lastBootstrapHeight = input.consensus.getLastBootstrapHeight();
		const isLastBlockOfRound = this._isLastBlockOfTheRound(input.block.header);
		const { height } = input.block.header;
		const isBootstrapPeriod = height <= lastBootstrapHeight;

		if (finalizedHeight !== this._finalizedHeight) {
			this._finalizedHeight = finalizedHeight;

			const finalizedBlockRound = this.rounds.calcRound(finalizedHeight);
			const disposableDelegateListUntilRound =
				finalizedBlockRound - this._delegateListRoundOffset - this._delegateActiveRoundLimit;
			await deleteVoteWeightsUntilRound(disposableDelegateListUntilRound, input.stateStore);
		}

		if (!isBootstrapPeriod) {
			// Calculate account.dpos.delegate.consecutiveMissedBlocks and account.dpos.delegate.isBanned
			await this._updateProductivity(input);
		}

		if (!isLastBlockOfRound) {
			return Promise.resolve();
		}

		await this._createVoteWeightSnapshot(input);

		if (!isBootstrapPeriod || (isBootstrapPeriod && height === lastBootstrapHeight)) {
			await this._updateValidators(input);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility,class-methods-use-this,@typescript-eslint/require-await
	public async afterGenesisBlockApply<T = Account<DPOSAccountProps>>(
		input: AfterGenesisBlockApplyInput<T>,
	): Promise<void> {
		const { accounts, initDelegates } = input.genesisBlock.header.asset;
		const delegateAddresses: Buffer[] = [];
		const delegateUsernames: { address: Buffer; username: string }[] = [];

		for (const account of (accounts as unknown) as Account<DPOSAccountProps>[]) {
			if (account.dpos.delegate.username !== '') {
				delegateUsernames.push({
					address: account.address,
					username: account.dpos.delegate.username,
				});
				delegateAddresses.push(account.address);
			}
		}

		if (!bufferArrayUniqueItems([...initDelegates])) {
			throw new Error('Genesis block init delegates list contains duplicate addresses');
		}

		if (!bufferArrayOrderByLex([...initDelegates])) {
			throw new Error('Genesis block init delegates list is not ordered lexicographically');
		}

		if (initDelegates.length > this._delegatesPerRound) {
			throw new Error(
				'Genesis block init delegates list is larger than allowed delegates per round',
			);
		}

		if (!bufferArrayContains(delegateAddresses, [...initDelegates])) {
			throw new Error(
				'Genesis block init delegates list contain addresses which are not delegates',
			);
		}

		setRegisteredDelegates(input.stateStore, { registeredDelegates: delegateUsernames });
	}

	private async _updateProductivity(input: AfterBlockApplyInput): Promise<void> {
		const {
			block: { header: blockHeader },
			consensus,
			stateStore,
		} = input;

		const round = this.rounds.calcRound(blockHeader.height);
		debug('Calculating missed block', round);

		const lastBlock = stateStore.chain.lastBlockHeaders[0];
		const expectedForgingAddresses = (await consensus.getDelegates()).map(d => d.address);

		const missedBlocks =
			Math.ceil((blockHeader.timestamp - lastBlock.timestamp) / this._blockTime) - 1;
		const forgerAddress = getAddressFromPublicKey(blockHeader.generatorPublicKey);
		const forgerIndex = expectedForgingAddresses.findIndex(address =>
			address.equals(forgerAddress),
		);
		// Update consecutive missed block
		for (let i = 0; i < missedBlocks; i += 1) {
			const rawIndex = (forgerIndex - 1 - i) % expectedForgingAddresses.length;
			const index = rawIndex >= 0 ? rawIndex : rawIndex + expectedForgingAddresses.length;
			const missedForgerAddress = expectedForgingAddresses[index];
			const missedForger = await stateStore.account.get<DPOSAccountProps>(missedForgerAddress);
			missedForger.dpos.delegate.consecutiveMissedBlocks += 1;

			// Ban the missed forger if both consecutive missed block and last forged blcok diff condition are met
			if (
				missedForger.dpos.delegate.consecutiveMissedBlocks > MAX_CONSECUTIVE_MISSED_BLOCKS &&
				blockHeader.height - missedForger.dpos.delegate.lastForgedHeight >
					MAX_LAST_FORGED_HEIGHT_DIFF
			) {
				missedForger.dpos.delegate.isBanned = true;
			}
			stateStore.account.set(missedForgerAddress, missedForger);
		}

		// Reset consecutive missed block
		const forger = await stateStore.account.get<DPOSAccountProps>(forgerAddress);
		forger.dpos.delegate.consecutiveMissedBlocks = 0;
		forger.dpos.delegate.lastForgedHeight = blockHeader.height;
		stateStore.account.set(forgerAddress, forger);
	}

	private async _createVoteWeightSnapshot(input: AfterBlockApplyInput): Promise<void> {
		const round = this.rounds.calcRound(input.block.header.height);
		// Calculate Vote Weights List
		debug('Creating delegate list for', round + this._delegateListRoundOffset);

		const snapshotHeight = input.block.header.height + 1;
		const snapshotRound = this.rounds.calcRound(snapshotHeight) + this._delegateListRoundOffset;
		await createVoteWeightsSnapshot({
			stateStore: input.stateStore,
			height: snapshotHeight,
			round: snapshotRound,
			activeDelegates: this._activeDelegates,
			standByDelegates: this._standbyDelegates,
		});
	}

	private async _updateValidators(input: AfterBlockApplyInput): Promise<void> {
		const round = this.rounds.calcRound(input.block.header.height);
		const nextRound = round + 1;

		debug('Updating delegate list for', nextRound);
		// Calculate Delegate List
		const [randomSeed1, randomSeed2] = generateRandomSeeds(
			round,
			this.rounds,
			input.stateStore.chain.lastBlockHeaders,
		);
		await updateDelegateList({
			round: nextRound,
			randomSeeds: [randomSeed1, randomSeed2],
			stateStore: input.stateStore,
			consensus: input.consensus,
			activeDelegates: this._activeDelegates,
			standbyDelegates: this._standbyDelegates,
		});
	}

	private _isLastBlockOfTheRound(block: BlockHeader): boolean {
		const round = this.rounds.calcRound(block.height);
		const nextRound = this.rounds.calcRound(block.height + 1);

		return round < nextRound;
	}
}
