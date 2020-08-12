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

import { objects as objectsUtils } from '@liskhq/lisk-utils';
import { Account } from '@liskhq/lisk-chain';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { BaseModule } from '../base_module';
import { AfterGenesisBlockApplyInput, GenesisConfig } from '../../types';
import { Rounds } from './rounds';
import { DPOSAccountProps } from './types';

const { bufferArrayUniqueItems, bufferArrayOrderByLex, bufferArrayContains } = objectsUtils;

export const dposModuleParamsSchema = {
	$id: '/dops/params',
	type: 'object',
	required: ['activeDelegates', 'standbyDelegates', 'delegateListRoundOffset'],
	additionalProperties: true,
	properties: {
		activeDelegates: {
			dataType: 'uint32',
			min: 1,
		},
		standbyDelegates: {
			dataType: 'uint32',
			min: 0,
		},
		delegateListRoundOffset: {
			dataType: 'uint32',
		},
	},
};

export class DPoSModule extends BaseModule {
	public name = 'dpos';
	public type = 5;
	public accountSchema = {
		type: 'object',
		properties: {
			delegate: {
				type: 'object',
				fieldNumber: 1,
				properties: {
					username: { dataType: 'string', fieldNumber: 1 },
					pomHeights: {
						type: 'array',
						items: { dataType: 'uint32' },
						fieldNumber: 2,
					},
					consecutiveMissedBlocks: { dataType: 'uint32', fieldNumber: 3 },
					lastForgedHeight: { dataType: 'uint32', fieldNumber: 4 },
					isBanned: { dataType: 'boolean', fieldNumber: 5 },
					totalVotesReceived: { dataType: 'uint64', fieldNumber: 6 },
				},
				required: [
					'username',
					'pomHeights',
					'consecutiveMissedBlocks',
					'lastForgedHeight',
					'isBanned',
					'totalVotesReceived',
				],
			},
			sentVotes: {
				type: 'array',
				fieldNumber: 2,
				items: {
					type: 'object',
					properties: {
						delegateAddress: {
							dataType: 'bytes',
							fieldNumber: 1,
						},
						amount: {
							dataType: 'uint64',
							fieldNumber: 2,
						},
					},
					required: ['delegateAddress', 'amount'],
				},
			},
			unlocking: {
				type: 'array',
				fieldNumber: 3,
				items: {
					type: 'object',
					properties: {
						delegateAddress: {
							dataType: 'bytes',
							fieldNumber: 1,
						},
						amount: {
							dataType: 'uint64',
							fieldNumber: 2,
						},
						unvoteHeight: {
							dataType: 'uint32',
							fieldNumber: 3,
						},
					},
					required: ['delegateAddress', 'amount', 'unvoteHeight'],
				},
			},
		},
		default: {
			delegate: {
				username: '',
				pomHeights: [],
				consecutiveMissedBlocks: 0,
				lastForgedHeight: 0,
				isBanned: false,
				totalVotesReceived: BigInt(0),
			},
			sentVotes: [],
			unlocking: [],
		},
	};

	public readonly rounds!: Rounds;

	private readonly _activeDelegates: number;
	private readonly _standbyDelegates: number;
	private readonly _delegateListRoundOffset: number;
	private readonly _delegatesPerRound: number;
	private readonly _delegateActiveRoundLimit: number;

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
		this._delegateActiveRoundLimit = 3;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility,class-methods-use-this,@typescript-eslint/require-await
	public async afterGenesisBlockApply<T = Account<DPOSAccountProps>>(
		input: AfterGenesisBlockApplyInput<T>,
	): Promise<void> {
		const { accounts, initDelegates } = input.genesisBlock.header.asset;

		const delegateAddresses = accounts
			.filter(
				account =>
					((account as unknown) as Account<DPOSAccountProps>).dpos.delegate.username !== '',
			)
			.map(account => ((account as unknown) as Account<DPOSAccountProps>).address);

		if (!bufferArrayUniqueItems(initDelegates)) {
			throw new Error('Genesis block init delegates list contains duplicate addresses');
		}

		if (!bufferArrayOrderByLex(initDelegates)) {
			throw new Error('Genesis block init delegates list is not ordered lexicographically');
		}

		if (initDelegates.length > this._delegatesPerRound) {
			throw new Error(
				'Genesis block init delegates list is larger than allowed delegates per round',
			);
		}

		if (!bufferArrayContains(delegateAddresses, initDelegates)) {
			throw new Error(
				'Genesis block init delegates list contain addresses which are not delegates',
			);
		}
	}
}
