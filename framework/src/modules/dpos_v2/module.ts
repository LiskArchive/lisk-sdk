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
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
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
	COMMAND_ID_UPDATE_GENERATOR_KEY,
	COMMAND_ID_VOTE,
	DELEGATE_LIST_ROUND_OFFSET,
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_SNAPSHOT,
} from './constants';
import { DPoSEndpoint } from './endpoint';
import { configSchema, delegateStoreSchema, snapshotStoreSchema } from './schemas';
import {
	BFTAPI,
	RandomAPI,
	TokenAPI,
	ValidatorsAPI,
	ModuleConfig,
	DelegateAccount,
	SnapshotStoreData,
} from './types';
import { Rounds } from './rounds';
import { isCurrentlyPunished } from './utils';

export class DPoSModule extends BaseModule {
	public id = MODULE_ID_DPOS;
	public name = 'dpos';
	public api = new DPoSAPI(this.id);
	public endpoint = new DPoSEndpoint(this.id);
	public configSchema = configSchema;
	public commands = [
		new DelegateRegistrationCommand(this.id),
		new ReportDelegateMisbehaviorCommand(this.id),
		new UnlockCommand(this.id),
		new UpdateGeneratorKeyCommand(this.id),
		new VoteCommand(this.id),
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

		const updateGeneratorKeyCommand = this.commands.find(
			command => command.id === COMMAND_ID_UPDATE_GENERATOR_KEY,
		) as UpdateGeneratorKeyCommand | undefined;

		if (!updateGeneratorKeyCommand) {
			throw Error("'updateGeneratorKeyCommand' is missing from DPoS module");
		}
		updateGeneratorKeyCommand.addDependencies(this._validatorsAPI);

		const voteCommand = this.commands.find(command => command.id === COMMAND_ID_VOTE) as
			| VoteCommand
			| undefined;
		if (!voteCommand) {
			throw new Error("'voteCommand' is missing from DPoS module");
		}
		voteCommand.addDependencies({
			tokenIDDPoS: this._moduleConfig.tokenIDDPoS,
			tokenAPI: this._tokenAPI,
		});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs) {
		const { moduleConfig } = args;
		const errors = validator.validate(configSchema, moduleConfig);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		this._moduleConfig = {
			...moduleConfig,
			minWeightStandby: BigInt(moduleConfig.minWeightStandby),
		} as ModuleConfig;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async afterGenesisBlockExecute(_context: GenesisBlockExecuteContext): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(this._bftAPI, this._randomAPI, this._validatorsAPI, this._moduleConfig);
	}

	public async afterBlockExecute(context: BlockAfterExecuteContext): Promise<void> {
		await this._createVoteWeightSnapshot(context);
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
}
