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

import { Account } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { objects as objectsUtils } from '@liskhq/lisk-utils';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { getMinWaitingHeight, getMinPunishedHeight } from './utils';
import { AfterBlockApplyContext, AfterGenesisBlockApplyContext, GenesisConfig } from '../../types';
import { BaseModule } from '../base_module';
import { CHAIN_STATE_DELEGATE_USERNAMES } from './constants';
import { deleteVoteWeightsUntilRound, setRegisteredDelegates } from './data_access';
import {
	createVoteWeightsSnapshot,
	updateDelegateList,
	updateDelegateProductivity,
} from './delegates';
import { generateRandomSeeds } from './random_seed';
import { Rounds } from './rounds';
import { delegatesUserNamesSchema, dposAccountSchema, dposModuleParamsSchema } from './schema';
import { PomTransactionAsset } from './transaction_assets/pom_transaction_asset';
import { RegisterTransactionAsset } from './transaction_assets/register_transaction_asset';
import { UnlockTransactionAsset } from './transaction_assets/unlock_transaction_asset';
import { VoteTransactionAsset } from './transaction_assets/vote_transaction_asset';
import {
	DPOSAccountProps,
	RegisteredDelegate,
	RegisteredDelegates,
	UnlockingInfoJSON,
} from './types';

const { bufferArrayContains } = objectsUtils;
const dposModuleParamsDefault = {
	activeDelegates: 101,
	standbyDelegates: 2,
	delegateListRoundOffset: 2,
};

export class DPoSModule extends BaseModule {
	public name = 'dpos';
	public id = 5;
	public accountSchema = dposAccountSchema;

	public readonly rounds: Rounds;
	public readonly transactionAssets = [
		new RegisterTransactionAsset(),
		new VoteTransactionAsset(),
		new UnlockTransactionAsset(),
		new PomTransactionAsset(),
	];

	private readonly _activeDelegates: number;
	private readonly _standbyDelegates: number;
	private readonly _delegateListRoundOffset: number;
	private readonly _blocksPerRound: number;
	private readonly _delegateActiveRoundLimit: number;
	private readonly _blockTime: number;
	private _finalizedHeight = 0;

	public constructor(config: GenesisConfig) {
		super(config);
		const mergedDposConfig = objectsUtils.mergeDeep(dposModuleParamsDefault, this.config);

		// Set actions
		this.actions = {
			getAllDelegates: async () => {
				const validatorsBuffer = await this._dataAccess.getChainState(
					CHAIN_STATE_DELEGATE_USERNAMES,
				);

				if (!validatorsBuffer) {
					return [];
				}

				const { registeredDelegates } = codec.decode<RegisteredDelegates>(
					delegatesUserNamesSchema,
					validatorsBuffer,
				);

				return registeredDelegates.map(delegate => ({
					username: delegate.username,
					address: delegate.address.toString('hex'),
				}));
			},

			getUnlockings: async (params: Record<string, unknown>): Promise<UnlockingInfoJSON[]> => {
				if (typeof params.address !== 'string') {
					throw new Error('Address must be a string');
				}
				const address = Buffer.from(params.address, 'hex');

				const account = await this._dataAccess.getAccountByAddress<DPOSAccountProps>(address);
				const result: UnlockingInfoJSON[] = [];

				for (const unlocking of account.dpos.unlocking) {
					const delegate = await this._dataAccess.getAccountByAddress<DPOSAccountProps>(
						unlocking.delegateAddress,
					);

					const minWaitingHeight = getMinWaitingHeight(
						account.address,
						delegate.address,
						unlocking,
					);
					const minPunishedHeight = getMinPunishedHeight(account, delegate);

					result.push({
						delegateAddress: unlocking.delegateAddress.toString('hex'),
						amount: unlocking.amount.toString(),
						unvoteHeight: unlocking.unvoteHeight,
						minUnlockHeight: Math.max(minWaitingHeight, minPunishedHeight),
					});
				}

				return result;
			},
		};

		const errors = validator.validate(dposModuleParamsSchema, mergedDposConfig);
		if (errors.length) {
			throw new LiskValidationError([...errors]);
		}

		if ((mergedDposConfig.activeDelegates as number) < 1) {
			throw new Error('Active delegates must have minimum 1');
		}

		if (
			(mergedDposConfig.activeDelegates as number) < (mergedDposConfig.standbyDelegates as number)
		) {
			throw new Error('Active delegates must be greater or equal to standby delegates');
		}

		this._activeDelegates = mergedDposConfig.activeDelegates as number;
		this._standbyDelegates = mergedDposConfig.standbyDelegates as number;
		this._delegateListRoundOffset = mergedDposConfig.delegateListRoundOffset as number;
		this._blocksPerRound = this._activeDelegates + this._standbyDelegates;
		this._blockTime = config.blockTime;
		this._delegateActiveRoundLimit = 3;

		this.rounds = new Rounds({ blocksPerRound: this._blocksPerRound });
	}

	public async afterBlockApply(context: AfterBlockApplyContext): Promise<void> {
		const finalizedHeight = context.consensus.getFinalizedHeight();
		const { height } = context.block.header;
		const isLastBlockOfRound = this._isLastBlockOfTheRound(height);

		if (finalizedHeight !== this._finalizedHeight) {
			this._finalizedHeight = finalizedHeight;

			const finalizedBlockRound = this.rounds.calcRound(finalizedHeight);
			const disposableDelegateListUntilRound =
				finalizedBlockRound - this._delegateListRoundOffset - this._delegateActiveRoundLimit;
			this._logger.debug(disposableDelegateListUntilRound, 'Deleting voteWeights until round');
			await deleteVoteWeightsUntilRound(disposableDelegateListUntilRound, context.stateStore);
		}

		await this._updateProductivity(context);

		if (!isLastBlockOfRound) {
			return;
		}

		await this._createVoteWeightSnapshot(context);
		await this._updateValidators(context);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async afterGenesisBlockApply<T = Account<DPOSAccountProps>>(
		context: AfterGenesisBlockApplyContext<T>,
	): Promise<void> {
		const { accounts, initDelegates } = context.genesisBlock.header.asset;
		const delegateAddresses: Buffer[] = [];
		const delegateUsernames: RegisteredDelegate[] = [];

		for (const account of (accounts as unknown) as Account<DPOSAccountProps>[]) {
			if (account.dpos.delegate.username !== '') {
				delegateUsernames.push({
					address: account.address,
					username: account.dpos.delegate.username,
				});
				delegateAddresses.push(account.address);
			}
		}

		if (initDelegates.length > this._blocksPerRound) {
			throw new Error(
				'Genesis block init delegates list is larger than allowed delegates per round.',
			);
		}

		if (!bufferArrayContains(delegateAddresses, [...initDelegates])) {
			throw new Error(
				'Genesis block init delegates list contain addresses which are not delegates.',
			);
		}

		await setRegisteredDelegates(context.stateStore, { registeredDelegates: delegateUsernames });

		const roundAfterGenesis = this.rounds.calcRound(context.genesisBlock.header.height) + 1;
		for (
			let i = roundAfterGenesis;
			i <= roundAfterGenesis + this._delegateListRoundOffset;
			i += 1
		) {
			// Height is 1, but to create round 1-3, round offset should start from 0 - 2
			await createVoteWeightsSnapshot({
				logger: this._logger,
				stateStore: context.stateStore,
				height: context.genesisBlock.header.height,
				round: i,
				activeDelegates: this._activeDelegates,
				standbyDelegates: this._standbyDelegates,
			});
		}
	}

	private async _updateProductivity(context: AfterBlockApplyContext): Promise<void> {
		const {
			block: { header: blockHeader },
			consensus,
			stateStore,
		} = context;

		const round = this.rounds.calcRound(blockHeader.height);
		this._logger.debug(round, 'Updating delegates productivity for round');
		await updateDelegateProductivity({
			height: blockHeader.height,
			blockTime: this._blockTime,
			blockTimestamp: blockHeader.timestamp,
			generatorPublicKey: blockHeader.generatorPublicKey,
			stateStore,
			consensus,
		});
	}

	private async _createVoteWeightSnapshot(context: AfterBlockApplyContext): Promise<void> {
		const round = this.rounds.calcRound(context.block.header.height);
		// Calculate Vote Weights List
		this._logger.debug(round + this._delegateListRoundOffset, 'Creating delegate list for round');

		const snapshotHeight = context.block.header.height + 1;
		const snapshotRound = this.rounds.calcRound(snapshotHeight) + this._delegateListRoundOffset;
		await createVoteWeightsSnapshot({
			logger: this._logger,
			stateStore: context.stateStore,
			height: snapshotHeight,
			round: snapshotRound,
			activeDelegates: this._activeDelegates,
			standbyDelegates: this._standbyDelegates,
		});
	}

	private async _updateValidators(context: AfterBlockApplyContext): Promise<void> {
		const round = this.rounds.calcRound(context.block.header.height);
		const nextRound = round + 1;

		this._logger.debug(nextRound, 'Updating delegate list for');
		// Calculate Delegate List
		const [randomSeed1, randomSeed2] = generateRandomSeeds({
			round,
			rounds: this.rounds,
			headers: context.stateStore.chain.lastBlockHeaders,
			logger: this._logger,
		});
		await updateDelegateList({
			round: nextRound,
			randomSeeds: [randomSeed1, randomSeed2],
			stateStore: context.stateStore,
			consensus: context.consensus,
			activeDelegates: this._activeDelegates,
			standbyDelegates: this._standbyDelegates,
		});
	}

	private _isLastBlockOfTheRound(height: number): boolean {
		const round = this.rounds.calcRound(height);
		const nextRound = this.rounds.calcRound(height + 1);

		return round < nextRound;
	}
}
