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

import { intToBuffer } from '@liskhq/lisk-cryptography';
import { objects as objectUtils, dataStructures, objects } from '@liskhq/lisk-utils';
import { isUInt64, LiskValidationError, validator } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { GenesisBlockExecuteContext, BlockAfterExecuteContext } from '../../node/state_machine';
import { BaseModule, ModuleInitArgs } from '../base_module';
import { DPoSAPI } from './api';
import { DelegateRegistrationCommand } from './commands/delegate_registration';
import { ReportDelegateMisbehaviorCommand } from './commands/pom';
import { UnlockCommand } from './commands/unlock';
import { UpdateGeneratorKeyCommand } from './commands/update_generator_key';
import { VoteCommand } from './commands/vote';
import {
	MODULE_ID_DPOS,
	DELEGATE_LIST_ROUND_OFFSET,
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_SNAPSHOT,
	STORE_PREFIX_PREVIOUS_TIMESTAMP,
	EMPTY_KEY,
	STORE_PREFIX_GENESIS_DATA,
	MAX_VOTE,
	MAX_UNLOCKING,
	MAX_SNAPSHOT,
	STORE_PREFIX_NAME,
	STORE_PREFIX_VOTER,
	defaultConfig,
} from './constants';
import { DPoSEndpoint } from './endpoint';
import {
	configSchema,
	delegateStoreSchema,
	genesisDataStoreSchema,
	genesisStoreSchema,
	nameStoreSchema,
	previousTimestampStoreSchema,
	snapshotStoreSchema,
	voterStoreSchema,
} from './schemas';
import {
	BFTAPI,
	RandomAPI,
	TokenAPI,
	ValidatorsAPI,
	ModuleConfig,
	DelegateAccount,
	SnapshotStoreData,
	PreviousTimestampData,
	GenesisData,
	GenesisStore,
	VoterData,
} from './types';
import { Rounds } from './rounds';
import {
	equalUnlocking,
	isCurrentlyPunished,
	isUsername,
	selectStandbyDelegates,
	shuffleDelegateList,
	sortUnlocking,
	validtorsEqual,
} from './utils';

export class DPoSModule extends BaseModule {
	public id = MODULE_ID_DPOS;
	public name = 'dpos';
	public api = new DPoSAPI(this.id);
	public endpoint = new DPoSEndpoint(this.id);
	public configSchema = configSchema;

	private readonly _delegateRegistrationCommand = new DelegateRegistrationCommand(this.id);
	private readonly _reportDelegateMisbehaviorCommand = new ReportDelegateMisbehaviorCommand(
		this.id,
	);
	private readonly _unlockCommand = new UnlockCommand(this.id);
	private readonly _updateGeneratorKeyCommand = new UpdateGeneratorKeyCommand(this.id);
	private readonly _voteCommand = new VoteCommand(this.id);

	// eslint-disable-next-line @typescript-eslint/member-ordering
	public commands = [
		this._delegateRegistrationCommand,
		this._reportDelegateMisbehaviorCommand,
		this._unlockCommand,
		this._updateGeneratorKeyCommand,
		this._voteCommand,
	];

	private _randomAPI!: RandomAPI;
	private _bftAPI!: BFTAPI;
	private _validatorsAPI!: ValidatorsAPI;
	private _tokenAPI!: TokenAPI;
	private _moduleConfig!: ModuleConfig;

	public addDependencies(
		randomAPI: RandomAPI,
		bftAPI: BFTAPI,
		validatorsAPI: ValidatorsAPI,
		tokenAPI: TokenAPI,
	) {
		this._bftAPI = bftAPI;
		this._randomAPI = randomAPI;
		this._validatorsAPI = validatorsAPI;
		this._tokenAPI = tokenAPI;

		this._delegateRegistrationCommand.addDependencies(this._validatorsAPI);
		this._reportDelegateMisbehaviorCommand.addDependencies({
			bftAPI: this._bftAPI,
			tokenAPI: this._tokenAPI,
			validatorsAPI: this._validatorsAPI,
		});
		this._unlockCommand.addDependencies({
			tokenAPI: this._tokenAPI,
			bftAPI: this._bftAPI,
		});
		this._updateGeneratorKeyCommand.addDependencies(this._validatorsAPI);
		this._voteCommand.addDependencies({
			tokenAPI: this._tokenAPI,
		});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs) {
		const { moduleConfig } = args;
		const config = objects.mergeDeep({}, defaultConfig, moduleConfig);
		const errors = validator.validate(configSchema, config);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		this._moduleConfig = {
			...config,
			minWeightStandby: BigInt(config.minWeightStandby),
			tokenIDDPoS: Buffer.from(config.tokenIDDPoS, 'hex'),
		} as ModuleConfig;

		this._reportDelegateMisbehaviorCommand.init({ tokenIDDPoS: this._moduleConfig.tokenIDDPoS });
		this._unlockCommand.init({ tokenIDDPoS: this._moduleConfig.tokenIDDPoS });
		this._voteCommand.init({ tokenIDDPoS: this._moduleConfig.tokenIDDPoS });
	}

	public async initGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		const assetBytes = context.assets.getAsset(this.id);
		// if there is no asset, do not initialize
		if (!assetBytes) {
			return;
		}
		const genesisStore = codec.decode<GenesisStore>(genesisStoreSchema, assetBytes);
		const errors = validator.validate(genesisStoreSchema, genesisStore);

		if (errors.length > 0) {
			throw new LiskValidationError(errors);
		}

		// validators property check
		const dposValidatorAddresses = [];
		const dposValidatorNames = [];
		const dposValidatorAddressMap = new dataStructures.BufferMap();
		for (const dposValidator of genesisStore.validators) {
			if (!isUsername(dposValidator.name)) {
				throw new Error(`Invalid validator name ${dposValidator.name}.`);
			}
			dposValidatorAddressMap.set(dposValidator.address, true);
			dposValidatorAddresses.push(dposValidator.address);
			dposValidatorNames.push(dposValidator.name);
		}
		if (!objectUtils.bufferArrayUniqueItems(dposValidatorAddresses)) {
			throw new Error('Validator address is not unique.');
		}
		if (new Set(dposValidatorNames).size !== dposValidatorNames.length) {
			throw new Error('Validator name is not unique.');
		}
		// voters property check
		const voterAddresses = [];
		for (const voter of genesisStore.voters) {
			if (voter.sentVotes.length > MAX_VOTE) {
				throw new Error(`Sent vote exceeds max vote ${MAX_VOTE}.`);
			}
			if (!objectUtils.bufferArrayUniqueItems(voter.sentVotes.map(v => v.delegateAddress))) {
				throw new Error('Sent vote delegate address is not unique.');
			}
			if (!objectUtils.bufferArrayOrderByLex(voter.sentVotes.map(v => v.delegateAddress))) {
				throw new Error('Sent vote delegate address is not lexicographically ordered.');
			}
			if (voter.sentVotes.some(v => !dposValidatorAddressMap.has(v.delegateAddress))) {
				throw new Error('Sent vote includes non existing validator address.');
			}
			if (voter.pendingUnlocks.length > MAX_UNLOCKING) {
				throw new Error(`PendingUnlocks exceeds max unlocking ${MAX_UNLOCKING}.`);
			}
			const sortingPendingUnlocks = [...voter.pendingUnlocks];
			sortUnlocking(sortingPendingUnlocks);
			for (let i = 0; i < voter.pendingUnlocks.length; i += 1) {
				const original = voter.pendingUnlocks[i];
				const target = sortingPendingUnlocks[i];
				if (!equalUnlocking(original, target)) {
					throw new Error('PendingUnlocks are not lexicographically ordered.');
				}
			}
			if (voter.pendingUnlocks.some(v => !dposValidatorAddressMap.has(v.delegateAddress))) {
				throw new Error('Pending unlocks includes non existing validator address.');
			}
			voterAddresses.push(voter.address);
		}
		if (!objectUtils.bufferArrayUniqueItems(voterAddresses)) {
			throw new Error('Voter address is not unique.');
		}
		// snapshot check
		if (genesisStore.snapshots.length > MAX_SNAPSHOT) {
			throw new Error(`Snapshot exceeds max snapshot length ${MAX_SNAPSHOT}.`);
		}
		if (
			new Set(genesisStore.snapshots.map(s => s.roundNumber)).size !== genesisStore.snapshots.length
		) {
			throw new Error('Snapshot round must be unique.');
		}
		for (const snapshot of genesisStore.snapshots) {
			if (!objectUtils.bufferArrayUniqueItems(snapshot.activeDelegates)) {
				throw new Error('Snapshot active delegates address is not unique.');
			}
			if (snapshot.activeDelegates.some(v => !dposValidatorAddressMap.has(v))) {
				throw new Error('Snapshot active delegates includes non existing validator address.');
			}
			const delegateWeightAddresses = [];
			for (const delegateWeight of snapshot.delegateWeightSnapshot) {
				if (!dposValidatorAddressMap.has(delegateWeight.delegateAddress)) {
					throw new Error('Delegate weight address has non existing validator address.');
				}
				delegateWeightAddresses.push(delegateWeight.delegateAddress);
			}
			if (!objectUtils.bufferArrayUniqueItems(delegateWeightAddresses)) {
				throw new Error('Snapshot delegate weight address is not unique.');
			}
		}
		// check genesis state
		if (!objectUtils.bufferArrayUniqueItems(genesisStore.genesisData.initDelegates)) {
			throw new Error('Init delegates address is not unique.');
		}
		if (genesisStore.genesisData.initDelegates.some(v => !dposValidatorAddressMap.has(v))) {
			throw new Error('Init delegates includes non existing validator address.');
		}
		if (genesisStore.genesisData.initDelegates.length > this._moduleConfig.numberActiveDelegates) {
			throw new Error(
				`Init delegates is greater than number of active delegates ${this._moduleConfig.numberActiveDelegates}.`,
			);
		}

		const voterStore = context.getStore(this.id, STORE_PREFIX_VOTER);
		const voteMap = new dataStructures.BufferMap<{ selfVotes: bigint; voteReceived: bigint }>();
		for (const voter of genesisStore.voters) {
			for (const sentVote of voter.sentVotes) {
				const delegate = voteMap.get(sentVote.delegateAddress) ?? {
					selfVotes: BigInt(0),
					voteReceived: BigInt(0),
				};
				delegate.voteReceived += sentVote.amount;
				if (!isUInt64(delegate.voteReceived)) {
					throw new Error('Votes received out of range.');
				}
				if (sentVote.delegateAddress.equals(voter.address)) {
					delegate.selfVotes += sentVote.amount;
					if (!isUInt64(delegate.selfVotes)) {
						throw new Error('Self vote out of range.');
					}
				}
				voteMap.set(sentVote.delegateAddress, delegate);
			}
			await voterStore.setWithSchema(
				voter.address,
				{
					sentVotes: voter.sentVotes,
					pendingUnlocks: voter.pendingUnlocks,
				},
				voterStoreSchema,
			);
		}

		const delegateStore = context.getStore(this.id, STORE_PREFIX_DELEGATE);
		const nameSubstore = context.getStore(this.id, STORE_PREFIX_NAME);
		for (const dposValidator of genesisStore.validators) {
			const voteInfo = voteMap.get(dposValidator.address) ?? {
				selfVotes: BigInt(0),
				voteReceived: BigInt(0),
			};
			await delegateStore.setWithSchema(
				dposValidator.address,
				{
					name: dposValidator.name,
					totalVotesReceived: voteInfo.voteReceived,
					selfVotes: voteInfo.selfVotes,
					lastGeneratedHeight: dposValidator.lastGeneratedHeight,
					isBanned: dposValidator.isBanned,
					pomHeights: dposValidator.pomHeights,
					consecutiveMissedBlocks: dposValidator.consecutiveMissedBlocks,
				},
				delegateStoreSchema,
			);
			await nameSubstore.setWithSchema(
				Buffer.from(dposValidator.name, 'utf-8'),
				{ delegateAddress: dposValidator.address },
				nameStoreSchema,
			);
		}

		const snapshotStore = context.getStore(this.id, STORE_PREFIX_SNAPSHOT);
		for (const snapshot of genesisStore.snapshots) {
			const storeKey = intToBuffer(snapshot.roundNumber, 4);
			await snapshotStore.setWithSchema(
				storeKey,
				{
					activeDelegates: snapshot.activeDelegates,
					delegateWeightSnapshot: snapshot.delegateWeightSnapshot,
				},
				snapshotStoreSchema,
			);
		}
		const previousTimestampStore = context.getStore(this.id, STORE_PREFIX_PREVIOUS_TIMESTAMP);
		await previousTimestampStore.setWithSchema(
			EMPTY_KEY,
			{
				timestamp: context.header.timestamp,
			},
			previousTimestampStoreSchema,
		);

		const genesisDataStore = context.getStore(this.id, STORE_PREFIX_GENESIS_DATA);
		await genesisDataStore.setWithSchema(
			EMPTY_KEY,
			{
				height: context.header.height,
				initRounds: genesisStore.genesisData.initRounds,
				initDelegates: genesisStore.genesisData.initDelegates,
			},
			genesisDataStoreSchema,
		);
	}

	public async finalizeGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		const assetBytes = context.assets.getAsset(this.id);
		// if there is no asset, do not initialize
		if (!assetBytes) {
			return;
		}
		const genesisStore = codec.decode<GenesisStore>(genesisStoreSchema, assetBytes);
		const apiContext = context.getAPIContext();
		for (const dposValidator of genesisStore.validators) {
			const valid = await this._validatorsAPI.registerValidatorKeys(
				apiContext,
				dposValidator.address,
				dposValidator.blsKey,
				dposValidator.generatorKey,
				dposValidator.proofOfPossession,
			);
			if (!valid) {
				throw new Error('Invalid validator key.');
			}
		}
		const voterStore = context.getStore(this.id, STORE_PREFIX_VOTER);
		const allVoters = await voterStore.iterateWithSchema<VoterData>(
			{
				start: Buffer.alloc(20),
				end: Buffer.alloc(20, 255),
			},
			voterStoreSchema,
		);
		for (const voterData of allVoters) {
			let votedAmount = BigInt(0);
			for (const sentVotes of voterData.value.sentVotes) {
				votedAmount += sentVotes.amount;
			}
			for (const pendingUnlock of voterData.value.pendingUnlocks) {
				votedAmount += pendingUnlock.amount;
			}
			const lockedAmount = await this._tokenAPI.getLockedAmount(
				apiContext,
				voterData.key,
				this._moduleConfig.tokenIDDPoS,
				this.id,
			);
			if (lockedAmount !== votedAmount) {
				throw new Error('Voted amount is not locked');
			}
		}

		const initDelegates = [...genesisStore.genesisData.initDelegates];
		initDelegates.sort((a, b) => a.compare(b));
		const bftWeights = initDelegates.map(d => ({
			bftWeight: BigInt(1),
			address: d,
		}));
		const initBFTThreshold = BigInt(Math.floor((2 * initDelegates.length) / 3) + 1);
		await this._bftAPI.setBFTParameters(apiContext, initBFTThreshold, initBFTThreshold, bftWeights);
		await this._validatorsAPI.setGeneratorList(apiContext, initDelegates);

		const MAX_UINT32 = 2 ** 32 - 1;
		const snapshotStore = context.getStore(this.id, STORE_PREFIX_SNAPSHOT);
		const allSnapshots = await snapshotStore.iterate({
			start: intToBuffer(0, 4),
			end: intToBuffer(MAX_UINT32, 4),
		});
		if (context.header.height === 0 && allSnapshots.length > 0) {
			throw new Error('When genensis height is zero, there should not be a snapshot.');
		}
		if (context.header.height !== 0) {
			if (allSnapshots.length === 0) {
				throw new Error('When genesis height is non-zero, snapshot is required.');
			}
			const genesisRound = new Rounds({ blocksPerRound: this._moduleConfig.roundLength }).calcRound(
				context.header.height,
			);
			const lastsnapshotRound = allSnapshots[allSnapshots.length - 1].key.readUInt32BE(0);
			if (lastsnapshotRound !== genesisRound) {
				throw new Error('Invalid snapshot. Latest snapshot should be the genesis round.');
			}
		}
	}

	public async afterTransactionsExecute(context: BlockAfterExecuteContext): Promise<void> {
		const { getStore, header } = context;
		const isLastBlockOfRound = this._isLastBlockOfTheRound(header.height);
		const previousTimestampStore = getStore(this.id, STORE_PREFIX_PREVIOUS_TIMESTAMP);
		const previousTimestampData = await previousTimestampStore.getWithSchema<PreviousTimestampData>(
			EMPTY_KEY,
			previousTimestampStoreSchema,
		);
		const { timestamp: previousTimestamp } = previousTimestampData;

		await this._updateProductivity(context, previousTimestamp);

		if (isLastBlockOfRound) {
			await this._createVoteWeightSnapshot(context);
		}

		const didBootstrapRoundsEnd = await this._didBootstrapRoundsEnd(context);
		if (isLastBlockOfRound && didBootstrapRoundsEnd) {
			await this._updateValidators(context);
		}

		await previousTimestampStore.setWithSchema(
			EMPTY_KEY,
			{ timestamp: header.timestamp },
			previousTimestampStoreSchema,
		);
	}

	private async _createVoteWeightSnapshot(context: BlockAfterExecuteContext): Promise<void> {
		const snapshotHeight = context.header.height + 1;
		const round = new Rounds({ blocksPerRound: this._moduleConfig.roundLength });
		const snapshotRound = round.calcRound(snapshotHeight) + DELEGATE_LIST_ROUND_OFFSET;
		context.logger.debug(`Creating vote weight snapshot for round: ${snapshotRound.toString()}`);

		const delegateStore = context.getStore(this.id, STORE_PREFIX_DELEGATE);
		const delegates = await delegateStore.iterateWithSchema<DelegateAccount>(
			{
				start: Buffer.alloc(20),
				end: Buffer.alloc(20, 255),
			},
			delegateStoreSchema,
		);
		const voteWeightCapRate = this._moduleConfig.factorSelfVotes;

		// Update totalVotesReceived to voteWeight equivalent before sorting
		for (const { value: account } of delegates) {
			// If the account is being punished, then consider them as vote weight 0
			if (isCurrentlyPunished(snapshotHeight, account.pomHeights)) {
				account.totalVotesReceived = BigInt(0);
				continue;
			}

			const cappedValue = account.selfVotes * BigInt(voteWeightCapRate);
			if (account.totalVotesReceived > cappedValue) {
				account.totalVotesReceived = cappedValue;
			}
		}

		delegates.sort((a, b) => {
			const diff = b.value.totalVotesReceived - a.value.totalVotesReceived;
			if (diff > BigInt(0)) {
				return 1;
			}
			if (diff < BigInt(0)) {
				return -1;
			}

			return a.key.compare(b.key);
		});

		const snapshotData: SnapshotStoreData = {
			activeDelegates: [],
			delegateWeightSnapshot: [],
		};

		for (const { key: address, value: account } of delegates) {
			// If the account is banned, do not include in the list
			if (account.isBanned) {
				continue;
			}

			// Select active delegate first
			if (snapshotData.activeDelegates.length < this._moduleConfig.numberActiveDelegates) {
				snapshotData.activeDelegates.push(address);
				continue;
			}

			// If account has more than threshold, save it as standby
			if (account.totalVotesReceived >= this._moduleConfig.minWeightStandby) {
				snapshotData.delegateWeightSnapshot.push({
					delegateAddress: address,
					delegateWeight: account.totalVotesReceived,
				});
				continue;
			}

			// From here, it's below threshold
			// Below threshold, but prepared array does not have enough selected delegate
			if (snapshotData.delegateWeightSnapshot.length < this._moduleConfig.numberStandbyDelegates) {
				// In case there was 1 standby delegate who has more than threshold
				snapshotData.delegateWeightSnapshot.push({
					delegateAddress: address,
					delegateWeight: account.totalVotesReceived,
				});
				continue;
			}
			break;
		}

		const snapshotStore = context.getStore(this.id, STORE_PREFIX_SNAPSHOT);
		const storeKey = intToBuffer(snapshotRound, 4);

		await snapshotStore.setWithSchema(storeKey, snapshotData, snapshotStoreSchema);

		// Remove outdated information
		const oldData = await snapshotStore.iterate({
			start: intToBuffer(0, 4),
			end: intToBuffer(Math.max(0, snapshotRound - DELEGATE_LIST_ROUND_OFFSET - 1), 4),
		});
		for (const { key } of oldData) {
			await snapshotStore.del(key);
		}
	}

	private async _updateValidators(context: BlockAfterExecuteContext): Promise<void> {
		const round = new Rounds({ blocksPerRound: this._moduleConfig.roundLength });
		const { height } = context.header;
		const nextRound = round.calcRound(height) + 1;
		context.logger.debug(nextRound, 'Updating delegate list for');

		const snapshotStore = context.getStore(this.id, STORE_PREFIX_SNAPSHOT);
		const snapshot = await snapshotStore.getWithSchema<SnapshotStoreData>(
			intToBuffer(nextRound, 4),
			snapshotStoreSchema,
		);

		const apiContext = context.getAPIContext();

		// get the last stored BFT parameters, and update them if needed
		const currentBFTParams = await this._bftAPI.getBFTParameters(apiContext, height);
		// snapshot.activeDelegates order should not be changed here to use it below
		const bftWeight = [...snapshot.activeDelegates]
			.sort((a, b) => a.compare(b))
			.map(address => ({ address, bftWeight: BigInt(1) }));
		if (
			!validtorsEqual(currentBFTParams.validators, bftWeight) ||
			currentBFTParams.precommitThreshold !== BigInt(this._moduleConfig.bftThreshold) ||
			currentBFTParams.certificateThreshold !== BigInt(this._moduleConfig.bftThreshold)
		) {
			await this._bftAPI.setBFTParameters(
				apiContext,
				BigInt(this._moduleConfig.bftThreshold),
				BigInt(this._moduleConfig.bftThreshold),
				bftWeight,
			);
		}

		// Update the validators
		const validators = [...snapshot.activeDelegates];
		const randomSeed1 = await this._randomAPI.getRandomBytes(
			apiContext,
			height + 1 - Math.floor((this._moduleConfig.roundLength * 3) / 2),
			this._moduleConfig.roundLength,
		);
		if (this._moduleConfig.numberStandbyDelegates === 2) {
			const randomSeed2 = await this._randomAPI.getRandomBytes(
				apiContext,
				height + 1 - 2 * this._moduleConfig.roundLength,
				this._moduleConfig.roundLength,
			);
			const standbyDelegates = selectStandbyDelegates(
				snapshot.delegateWeightSnapshot,
				randomSeed1,
				randomSeed2,
			);
			validators.push(...standbyDelegates);
		} else if (this._moduleConfig.numberStandbyDelegates === 1) {
			const standbyDelegates = selectStandbyDelegates(snapshot.delegateWeightSnapshot, randomSeed1);
			validators.push(...standbyDelegates);
		}
		const shuffledValidators = shuffleDelegateList(randomSeed1, validators);
		await this._validatorsAPI.setGeneratorList(apiContext, shuffledValidators);
	}

	private async _updateProductivity(context: BlockAfterExecuteContext, previousTimestamp: number) {
		const { logger, header, getAPIContext, getStore } = context;

		const round = new Rounds({ blocksPerRound: this._moduleConfig.roundLength });
		logger.debug(round, 'Updating delegates productivity for round');

		const newHeight = header.height;
		const apiContext = getAPIContext();
		const missedBlocks = await this._validatorsAPI.getGeneratorsBetweenTimestamps(
			apiContext,
			previousTimestamp,
			header.timestamp,
		);

		const delegateStore = getStore(MODULE_ID_DPOS, STORE_PREFIX_DELEGATE);
		for (const addressString of Object.keys(missedBlocks)) {
			const address = Buffer.from(addressString, 'binary');
			const delegate = await delegateStore.getWithSchema<DelegateAccount>(
				address,
				delegateStoreSchema,
			);
			delegate.consecutiveMissedBlocks += missedBlocks[addressString];
			if (
				delegate.consecutiveMissedBlocks > this._moduleConfig.failSafeMissedBlocks &&
				newHeight - delegate.lastGeneratedHeight > this._moduleConfig.failSafeInactiveWindow
			) {
				delegate.isBanned = true;
			}

			await delegateStore.setWithSchema(address, delegate, delegateStoreSchema);
		}

		const generator = await delegateStore.getWithSchema<DelegateAccount>(
			header.generatorAddress,
			delegateStoreSchema,
		);
		generator.consecutiveMissedBlocks = 0;
		generator.lastGeneratedHeight = newHeight;
		await delegateStore.setWithSchema(header.generatorAddress, generator, delegateStoreSchema);
	}

	private _isLastBlockOfTheRound(height: number): boolean {
		const rounds = new Rounds({ blocksPerRound: this._moduleConfig.roundLength });
		const currentRound = rounds.calcRound(height);
		const nextRound = rounds.calcRound(height + 1);

		return currentRound < nextRound;
	}

	private async _didBootstrapRoundsEnd(context: BlockAfterExecuteContext) {
		const { header, getStore } = context;
		const rounds = new Rounds({ blocksPerRound: this._moduleConfig.roundLength });
		const genesisDataStore = getStore(this.id, STORE_PREFIX_GENESIS_DATA);
		const genesisData = await genesisDataStore.getWithSchema<GenesisData>(
			EMPTY_KEY,
			genesisDataStoreSchema,
		);
		const { initRounds } = genesisData;
		const nextHeightRound = rounds.calcRound(header.height + 1);

		return nextHeightRound > initRounds;
	}
}
