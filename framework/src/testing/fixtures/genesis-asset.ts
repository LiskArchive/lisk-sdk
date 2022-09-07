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
 *
 */

import { genesisTokenStoreSchema } from '../../modules/token';
import * as accounts from './keys_fixture.json';

export const blockAssetsJSON = [
	{
		module: 'token',
		data: {
			userSubstore: accounts.keys
				.map(account => ({
					address: account.address,
					tokenID: '0000000000000000',
					availableBalance: '10000000000000',
					lockedBalances: [],
				}))
				.sort((a, b) => Buffer.from(a.address, 'hex').compare(Buffer.from(b.address, 'hex'))),
			supplySubstore: [
				{
					localID: '00000000',
					totalSupply: (BigInt(accounts.keys.length) * BigInt('10000000000000')).toString(),
				},
			],
			escrowSubstore: [],
			availableLocalIDSubstore: {
				nextAvailableLocalID: '00000000',
			},
			terminatedEscrowSubstore: [],
		},
		schema: genesisTokenStoreSchema,
	},
	{
		module: 'dpos',
		data: {
			validators: accounts.keys.map((account, i) => ({
				address: account.address,
				name: `genesis_${i}`,
				blsKey: account.plain.blsKey,
				proofOfPossession: account.plain.blsProofOfPosession,
				generatorKey: account.plain.generatorKey,
				lastGeneratedHeight: 0,
				isBanned: false,
				pomHeights: [],
				consecutiveMissedBlocks: 0,
			})),
			voters: [],
			snapshots: [],
			genesisData: {
				initRounds: 3,
				initDelegates: accounts.keys.slice(0, 101).map(account => account.address),
			},
		},
		schema: {
			$id: '/dpos/module/genesis',
			type: 'object',
			required: ['validators', 'voters', 'snapshots', 'genesisData'],
			properties: {
				validators: {
					type: 'array',
					fieldNumber: 1,
					items: {
						type: 'object',
						required: [
							'address',
							'name',
							'blsKey',
							'proofOfPossession',
							'generatorKey',
							'lastGeneratedHeight',
							'isBanned',
							'pomHeights',
							'consecutiveMissedBlocks',
						],
						properties: {
							address: {
								dataType: 'bytes',
								fieldNumber: 1,
								minLength: 20,
								maxLength: 20,
							},
							name: {
								dataType: 'string',
								fieldNumber: 2,
								minLength: 1,
								maxLength: 20,
							},
							blsKey: {
								dataType: 'bytes',
								fieldNumber: 3,
								minLength: 48,
								maxLength: 48,
							},
							proofOfPossession: {
								dataType: 'bytes',
								fieldNumber: 4,
								minLength: 96,
								maxLength: 96,
							},
							generatorKey: {
								dataType: 'bytes',
								fieldNumber: 5,
								minLength: 32,
								maxLength: 32,
							},
							lastGeneratedHeight: {
								dataType: 'uint32',
								fieldNumber: 6,
							},
							isBanned: {
								dataType: 'boolean',
								fieldNumber: 7,
							},
							pomHeights: {
								type: 'array',
								fieldNumber: 8,
								items: {
									dataType: 'uint32',
								},
							},
							consecutiveMissedBlocks: {
								dataType: 'uint32',
								fieldNumber: 9,
							},
						},
					},
				},
				voters: {
					type: 'array',
					fieldNumber: 2,
					items: {
						type: 'object',
						required: ['address', 'sentVotes', 'pendingUnlocks'],
						properties: {
							address: {
								dataType: 'bytes',
								fieldNumber: 1,
								minLength: 20,
								maxLength: 20,
							},
							sentVotes: {
								type: 'array',
								fieldNumber: 2,
								items: {
									type: 'object',
									required: ['delegateAddress', 'amount'],
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
								},
							},
							pendingUnlocks: {
								type: 'array',
								fieldNumber: 3,
								items: {
									type: 'object',
									required: ['delegateAddress', 'amount', 'unvoteHeight'],
									properties: {
										delegateAddress: {
											dataType: 'bytes',
											fieldNumber: 1,
											minLength: 20,
											maxLength: 20,
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
								},
							},
						},
					},
				},
				snapshots: {
					type: 'array',
					fieldNumber: 3,
					maxLength: 3,
					items: {
						type: 'object',
						required: ['roundNumber', 'activeDelegates', 'delegateWeightSnapshot'],
						properties: {
							roundNumber: {
								dataType: 'uint32',
								fieldNumber: 1,
							},
							activeDelegates: {
								type: 'array',
								fieldNumber: 2,
								items: {
									dataType: 'bytes',
								},
							},
							delegateWeightSnapshot: {
								type: 'array',
								fieldNumber: 3,
								items: {
									type: 'object',
									required: ['delegateAddress', 'delegateWeight'],
									properties: {
										delegateAddress: {
											dataType: 'bytes',
											fieldNumber: 1,
										},
										delegateWeight: {
											dataType: 'uint64',
											fieldNumber: 2,
										},
									},
								},
							},
						},
					},
				},
				genesisData: {
					type: 'object',
					fieldNumber: 4,
					required: ['initRounds', 'initDelegates'],
					properties: {
						initRounds: {
							dataType: 'uint32',
							fieldNumber: 1,
						},
						initDelegates: {
							type: 'array',
							fieldNumber: 2,
							items: {
								dataType: 'bytes',
							},
						},
					},
				},
			},
		},
	},
];
