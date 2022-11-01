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

import { utils } from '@liskhq/lisk-cryptography';
import { objects as objectUtils, dataStructures, objects } from '@liskhq/lisk-utils';
import { isUInt64, validator } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { GenesisBlockExecuteContext, BlockAfterExecuteContext } from '../../state_machine';
import { BaseModule, ModuleInitArgs, ModuleMetadata } from '../base_module';
import { DPoSMethod } from './method';
import { DelegateRegistrationCommand } from './commands/delegate_registration';
import { ReportDelegateMisbehaviorCommand } from './commands/pom';
import { UnlockCommand } from './commands/unlock';
import { UpdateGeneratorKeyCommand } from './commands/update_generator_key';
import { VoteDelegateCommand } from './commands/vote_delegate';
import {
	DELEGATE_LIST_ROUND_OFFSET,
	EMPTY_KEY,
	MAX_VOTE,
	MAX_UNLOCKING,
	MAX_SNAPSHOT,
	defaultConfig,
} from './constants';
import { DPoSEndpoint } from './endpoint';
import {
	configSchema,
	genesisStoreSchema,
	getAllDelegatesResponseSchema,
	getDelegateRequestSchema,
	getDelegateResponseSchema,
	getVoterRequestSchema,
	getVoterResponseSchema,
} from './schemas';
import {
	RandomMethod,
	TokenMethod,
	ValidatorsMethod,
	SnapshotStoreData,
	GenesisStore,
	ModuleConfigJSON,
	ModuleConfig,
} from './types';
import { Rounds } from './rounds';
import {
	equalUnlocking,
	isCurrentlyPunished,
	isUsername,
	selectStandbyDelegates,
	shuffleDelegateList,
	sortUnlocking,
	getModuleConfig,
} from './utils';
import { DelegateStore, VoteSharingCofficientObject } from './stores/delegate';
import { GenesisDataStore } from './stores/genesis';
import { NameStore } from './stores/name';
import { PreviousTimestampStore } from './stores/previous_timestamp';
import { SnapshotStore } from './stores/snapshot';
import { VoterStore } from './stores/voter';

export class DPoSModule extends BaseModule {
	public method = new DPoSMethod(this.stores, this.events);
	public configSchema = configSchema;
	public endpoint = new DPoSEndpoint(this.stores, this.offchainStores);

	private readonly _delegateRegistrationCommand = new DelegateRegistrationCommand(
		this.stores,
		this.events,
	);
	private readonly _reportDelegateMisbehaviorCommand = new ReportDelegateMisbehaviorCommand(
		this.stores,
		this.events,
	);
	private readonly _unlockCommand = new UnlockCommand(this.stores, this.events);
	private readonly _updateGeneratorKeyCommand = new UpdateGeneratorKeyCommand(
		this.stores,
		this.events,
	);
	private readonly _voteCommand = new VoteDelegateCommand(this.stores, this.events);

	// eslint-disable-next-line @typescript-eslint/member-ordering
	public commands = [
		this._delegateRegistrationCommand,
		this._reportDelegateMisbehaviorCommand,
		this._unlockCommand,
		this._updateGeneratorKeyCommand,
		this._voteCommand,
	];

	private _randomMethod!: RandomMethod;
	private _validatorsMethod!: ValidatorsMethod;
	private _tokenMethod!: TokenMethod;
	private _moduleConfig!: ModuleConfig;

	public constructor() {
		super();
		this.stores.register(DelegateStore, new DelegateStore(this.name));
		this.stores.register(GenesisDataStore, new GenesisDataStore(this.name));
		this.stores.register(NameStore, new NameStore(this.name));
		this.stores.register(PreviousTimestampStore, new PreviousTimestampStore(this.name));
		this.stores.register(SnapshotStore, new SnapshotStore(this.name));
		this.stores.register(VoterStore, new VoterStore(this.name));
	}

	public get name() {
		return 'dpos';
	}

	public addDependencies(
		randomMethod: RandomMethod,
		validatorsMethod: ValidatorsMethod,
		tokenMethod: TokenMethod,
	) {
		this._randomMethod = randomMethod;
		this._validatorsMethod = validatorsMethod;
		this._tokenMethod = tokenMethod;

		this._delegateRegistrationCommand.addDependencies(this._tokenMethod, this._validatorsMethod);
		this._reportDelegateMisbehaviorCommand.addDependencies({
			tokenMethod: this._tokenMethod,
			validatorsMethod: this._validatorsMethod,
		});
		this._unlockCommand.addDependencies({
			tokenMethod: this._tokenMethod,
		});
		this._updateGeneratorKeyCommand.addDependencies(this._validatorsMethod);
		this._voteCommand.addDependencies({
			tokenMethod: this._tokenMethod,
		});
	}

	public metadata(): ModuleMetadata {
		return {
			endpoints: [
				{
					name: this.endpoint.getAllDelegates.name,
					response: getAllDelegatesResponseSchema,
				},
				{
					name: this.endpoint.getDelegate.name,
					request: getDelegateRequestSchema,
					response: getDelegateResponseSchema,
				},
				{
					name: this.endpoint.getVoter.name,
					request: getVoterRequestSchema,
					response: getVoterResponseSchema,
				},
				{
					name: this.endpoint.getConstants.name,
					response: configSchema,
				},
			],
			commands: this.commands.map(command => ({
				name: command.name,
				params: command.schema,
			})),
			events: [],
			assets: [
				{
					version: 0,
					data: genesisStoreSchema,
				},
			],
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs) {
		const { moduleConfig } = args;
		const config = objects.mergeDeep({}, defaultConfig, moduleConfig) as ModuleConfigJSON;
		validator.validate(configSchema, config);

		this._moduleConfig = getModuleConfig(config);

		this.endpoint.init(this._moduleConfig);

		this._delegateRegistrationCommand.init({ tokenIDFee: this._moduleConfig.tokenIDFee });
		this._reportDelegateMisbehaviorCommand.init({ tokenIDDPoS: this._moduleConfig.tokenIDDPoS });
		this._unlockCommand.init({
			tokenIDDPoS: this._moduleConfig.tokenIDDPoS,
			roundLength: this._moduleConfig.roundLength,
		});
		this._voteCommand.init({ tokenIDDPoS: this._moduleConfig.tokenIDDPoS });
	}

	public async initGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		const assetBytes = context.assets.getAsset(this.name);
		// if there is no asset, do not initialize
		if (!assetBytes) {
			return;
		}
		const genesisStore = codec.decode<GenesisStore>(genesisStoreSchema, assetBytes);
		validator.validate(genesisStoreSchema, genesisStore);

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

		const voterStore = this.stores.get(VoterStore);
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
			await voterStore.set(context, voter.address, {
				// TODO: Issue #7669
				sentVotes: voter.sentVotes.map(sentVote => ({
					...sentVote,
					voteSharingCoefficients: [] as VoteSharingCofficientObject[],
				})),
				pendingUnlocks: voter.pendingUnlocks,
			});
		}

		const delegateStore = this.stores.get(DelegateStore);
		const nameSubstore = this.stores.get(NameStore);
		for (const dposValidator of genesisStore.validators) {
			const voteInfo = voteMap.get(dposValidator.address) ?? {
				selfVotes: BigInt(0),
				voteReceived: BigInt(0),
			};
			await delegateStore.set(context, dposValidator.address, {
				name: dposValidator.name,
				totalVotesReceived: voteInfo.voteReceived,
				selfVotes: voteInfo.selfVotes,
				lastGeneratedHeight: dposValidator.lastGeneratedHeight,
				isBanned: dposValidator.isBanned,
				pomHeights: dposValidator.pomHeights,
				consecutiveMissedBlocks: dposValidator.consecutiveMissedBlocks,
				// TODO: Issue: #7669
				commission: 0,
				lastCommissionIncreaseHeight: 0,
				sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
			});
			await nameSubstore.set(context, Buffer.from(dposValidator.name, 'utf-8'), {
				delegateAddress: dposValidator.address,
			});
		}

		const snapshotStore = this.stores.get(SnapshotStore);
		for (const snapshot of genesisStore.snapshots) {
			const storeKey = utils.intToBuffer(snapshot.roundNumber, 4);
			await snapshotStore.set(context, storeKey, {
				activeDelegates: snapshot.activeDelegates,
				delegateWeightSnapshot: snapshot.delegateWeightSnapshot,
			});
		}
		const previousTimestampStore = this.stores.get(PreviousTimestampStore);
		await previousTimestampStore.set(context, EMPTY_KEY, {
			timestamp: context.header.timestamp,
		});

		const genesisDataStore = this.stores.get(GenesisDataStore);
		await genesisDataStore.set(context, EMPTY_KEY, {
			height: context.header.height,
			initRounds: genesisStore.genesisData.initRounds,
			initDelegates: genesisStore.genesisData.initDelegates,
		});
	}

	public async finalizeGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		const assetBytes = context.assets.getAsset(this.name);
		// if there is no asset, do not initialize
		if (!assetBytes) {
			return;
		}
		const genesisStore = codec.decode<GenesisStore>(genesisStoreSchema, assetBytes);
		const methodContext = context.getMethodContext();
		for (const dposValidator of genesisStore.validators) {
			const valid = await this._validatorsMethod.registerValidatorKeys(
				methodContext,
				dposValidator.address,
				dposValidator.blsKey,
				dposValidator.generatorKey,
				dposValidator.proofOfPossession,
			);
			if (!valid) {
				throw new Error('Invalid validator key.');
			}
		}
		const voterStore = this.stores.get(VoterStore);
		const allVoters = await voterStore.iterate(context, {
			gte: Buffer.alloc(20),
			lte: Buffer.alloc(20, 255),
		});
		for (const voterData of allVoters) {
			let votedAmount = BigInt(0);
			for (const sentVotes of voterData.value.sentVotes) {
				votedAmount += sentVotes.amount;
			}
			for (const pendingUnlock of voterData.value.pendingUnlocks) {
				votedAmount += pendingUnlock.amount;
			}
			const lockedAmount = await this._tokenMethod.getLockedAmount(
				methodContext,
				voterData.key,
				this._moduleConfig.tokenIDDPoS,
				this.name,
			);
			if (lockedAmount !== votedAmount) {
				throw new Error('Voted amount is not locked');
			}
		}

		const initDelegates = [...genesisStore.genesisData.initDelegates];
		initDelegates.sort((a, b) => a.compare(b));
		const initBFTThreshold = BigInt(Math.floor((2 * initDelegates.length) / 3) + 1);
		const validators = [];
		for (const validatorAddress of initDelegates) {
			validators.push({
				address: validatorAddress,
				bftWeight: BigInt(1),
			});
		}
		await this._validatorsMethod.setValidatorsParams(
			context.getMethodContext(),
			context,
			initBFTThreshold,
			initBFTThreshold,
			validators,
		);

		const MAX_UINT32 = 2 ** 32 - 1;
		const snapshotStore = this.stores.get(SnapshotStore);
		const allSnapshots = await snapshotStore.iterate(context, {
			gte: utils.intToBuffer(0, 4),
			lte: utils.intToBuffer(MAX_UINT32, 4),
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
		const { header } = context;
		const isLastBlockOfRound = this._isLastBlockOfTheRound(header.height);
		const previousTimestampStore = this.stores.get(PreviousTimestampStore);
		const previousTimestampData = await previousTimestampStore.get(context, EMPTY_KEY);
		const { timestamp: previousTimestamp } = previousTimestampData;

		await this._updateProductivity(context, previousTimestamp);

		if (isLastBlockOfRound) {
			await this._createVoteWeightSnapshot(context);
		}

		const didBootstrapRoundsEnd = await this._didBootstrapRoundsEnd(context);
		if (isLastBlockOfRound && didBootstrapRoundsEnd) {
			await this._updateValidators(context);
		}

		await previousTimestampStore.set(context, EMPTY_KEY, { timestamp: header.timestamp });
	}

	private async _createVoteWeightSnapshot(context: BlockAfterExecuteContext): Promise<void> {
		const snapshotHeight = context.header.height + 1;
		const round = new Rounds({ blocksPerRound: this._moduleConfig.roundLength });
		const snapshotRound = round.calcRound(snapshotHeight) + DELEGATE_LIST_ROUND_OFFSET;
		context.logger.debug(`Creating vote weight snapshot for round: ${snapshotRound.toString()}`);

		const delegateStore = this.stores.get(DelegateStore);
		const delegates = await delegateStore.iterate(context, {
			gte: Buffer.alloc(20),
			lte: Buffer.alloc(20, 255),
		});
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

		const snapshotStore = this.stores.get(SnapshotStore);
		const storeKey = utils.intToBuffer(snapshotRound, 4);

		await snapshotStore.set(context, storeKey, snapshotData);

		// Remove outdated information
		const oldData = await snapshotStore.iterate(context, {
			gte: utils.intToBuffer(0, 4),
			lte: utils.intToBuffer(Math.max(0, snapshotRound - DELEGATE_LIST_ROUND_OFFSET - 1), 4),
		});
		for (const { key } of oldData) {
			await snapshotStore.del(context, key);
		}
	}

	private async _updateValidators(context: BlockAfterExecuteContext): Promise<void> {
		const round = new Rounds({ blocksPerRound: this._moduleConfig.roundLength });
		const { height } = context.header;
		const nextRound = round.calcRound(height) + 1;
		context.logger.debug(nextRound, 'Updating delegate list for');

		const snapshotStore = this.stores.get(SnapshotStore);
		const snapshot = await snapshotStore.get(context, utils.intToBuffer(nextRound, 4));

		const methodContext = context.getMethodContext();

		// Update the validators
		const validators = [...snapshot.activeDelegates];
		let standbyDelegates: Buffer[] = [];
		const randomSeed1 = await this._randomMethod.getRandomBytes(
			methodContext,
			height + 1 - Math.floor((this._moduleConfig.roundLength * 3) / 2),
			this._moduleConfig.roundLength,
		);
		if (this._moduleConfig.numberStandbyDelegates === 2) {
			const randomSeed2 = await this._randomMethod.getRandomBytes(
				methodContext,
				height + 1 - 2 * this._moduleConfig.roundLength,
				this._moduleConfig.roundLength,
			);
			standbyDelegates = selectStandbyDelegates(
				snapshot.delegateWeightSnapshot,
				randomSeed1,
				randomSeed2,
			);
			validators.push(...standbyDelegates);
		} else if (this._moduleConfig.numberStandbyDelegates === 1) {
			standbyDelegates = selectStandbyDelegates(snapshot.delegateWeightSnapshot, randomSeed1);
			validators.push(...standbyDelegates);
		}
		const shuffledValidators = shuffleDelegateList(randomSeed1, validators);
		const bftValidators = [];
		// TODO: Issue #7670
		for (const validatorAddress of shuffledValidators) {
			const isActive =
				snapshot.activeDelegates.findIndex(addr => addr.equals(validatorAddress)) > -1;
			// if validator is active
			bftValidators.push({
				address: validatorAddress,
				bftWeight: isActive ? BigInt(1) : BigInt(0),
			});
		}
		await this._validatorsMethod.setValidatorsParams(
			context.getMethodContext(),
			context,
			BigInt(this._moduleConfig.bftThreshold),
			BigInt(this._moduleConfig.bftThreshold),
			bftValidators,
		);
	}

	private async _updateProductivity(context: BlockAfterExecuteContext, previousTimestamp: number) {
		const { logger, header, getMethodContext } = context;

		const round = new Rounds({ blocksPerRound: this._moduleConfig.roundLength });
		logger.debug(round, 'Updating delegates productivity for round');

		const newHeight = header.height;
		const methodContext = getMethodContext();
		const missedBlocks = await this._validatorsMethod.getGeneratorsBetweenTimestamps(
			methodContext,
			previousTimestamp,
			header.timestamp,
		);

		const delegateStore = this.stores.get(DelegateStore);
		for (const addressString of Object.keys(missedBlocks)) {
			const address = Buffer.from(addressString, 'binary');
			const delegate = await delegateStore.get(context, address);
			delegate.consecutiveMissedBlocks += missedBlocks[addressString];
			if (
				delegate.consecutiveMissedBlocks > this._moduleConfig.failSafeMissedBlocks &&
				newHeight - delegate.lastGeneratedHeight > this._moduleConfig.failSafeInactiveWindow
			) {
				delegate.isBanned = true;
			}

			await delegateStore.set(context, address, delegate);
		}

		const generator = await delegateStore.get(context, header.generatorAddress);
		generator.consecutiveMissedBlocks = 0;
		generator.lastGeneratedHeight = newHeight;
		await delegateStore.set(context, header.generatorAddress, generator);
	}

	private _isLastBlockOfTheRound(height: number): boolean {
		const rounds = new Rounds({ blocksPerRound: this._moduleConfig.roundLength });
		const currentRound = rounds.calcRound(height);
		const nextRound = rounds.calcRound(height + 1);

		return currentRound < nextRound;
	}

	private async _didBootstrapRoundsEnd(context: BlockAfterExecuteContext) {
		const { header } = context;
		const rounds = new Rounds({ blocksPerRound: this._moduleConfig.roundLength });
		const genesisDataStore = this.stores.get(GenesisDataStore);
		const genesisData = await genesisDataStore.get(context, EMPTY_KEY);
		const { initRounds } = genesisData;
		const nextHeightRound = rounds.calcRound(header.height + 1);

		return nextHeightRound > initRounds;
	}
}
