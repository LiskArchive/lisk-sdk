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

import { Slots } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { voteWeightsSchema, forgerListSchema } from '../../src/schemas';
import { DelegatesList } from '../../src/delegates_list';
import { BLOCK_TIME, EPOCH_TIME } from '../fixtures/constants';
import {
	DEFAULT_STANDBY_THRESHOLD,
	DEFAULT_VOTE_WEIGHT_CAP_RATE,
	DEFAULT_STANDBY_DELEGATE,
	DEFAULT_ACTIVE_DELEGATE,
	CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
	CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
} from '../../src/constants';
import { Rounds } from '../../src';

import * as forgerSelectionZeroStandbyScenario from '../fixtures/dpos_forger_selection/dpos_forger_selection_0_standby.json';
import * as forgerSelectionOneStandbyScenario from '../fixtures/dpos_forger_selection/dpos_forger_selection_exactly_1_standby.json';
import * as forgerSelectionTwoStandbyScenario from '../fixtures/dpos_forger_selection/dpos_forger_selection_exactly_2_standby.json';
import * as forgerSelectionLessTHan103Scenario from '../fixtures/dpos_forger_selection/dpos_forger_selection_less_than_103.json';
import * as forgerSelectionMoreThan2StandByScenario from '../fixtures/dpos_forger_selection/dpos_forger_selection_more_than_2_standby.json';
import { StateStoreMock } from '../utils/state_store_mock';
import { searchBufferArray } from '../utils/search_buffer_array';

describe('Forger selection', () => {
	let delegateList: DelegatesList;
	let chainStub: any;
	let stateStore: StateStoreMock;

	beforeEach(() => {
		chainStub = {
			slots: new Slots({ epochTime: EPOCH_TIME, interval: BLOCK_TIME }) as any,
			dataAccess: {
				getBlockHeadersByHeightBetween: jest.fn().mockResolvedValue([]),
				getConsensusState: jest.fn().mockResolvedValue(undefined),
				getDelegateAccounts: jest.fn().mockResolvedValue([]),
				getDelegates: jest.fn().mockResolvedValue([]),
			},
		};
		delegateList = new DelegatesList({
			chain: chainStub,
			rounds: new Rounds({
				blocksPerRound: DEFAULT_ACTIVE_DELEGATE + DEFAULT_STANDBY_DELEGATE,
			}),
			activeDelegates: DEFAULT_ACTIVE_DELEGATE,
			standbyDelegates: DEFAULT_STANDBY_DELEGATE,
			standbyThreshold: DEFAULT_STANDBY_THRESHOLD,
			voteWeightCapRate: DEFAULT_VOTE_WEIGHT_CAP_RATE,
		});
	});

	describe('given valid scenarios', () => {
		const scenarios = [
			forgerSelectionZeroStandbyScenario,
			forgerSelectionOneStandbyScenario,
			forgerSelectionTwoStandbyScenario,
			forgerSelectionLessTHan103Scenario,
			forgerSelectionMoreThan2StandByScenario,
		];
		const defaultRound = 5;

		for (const scenario of scenarios) {
			// eslint-disable-next-line no-loop-func
			describe(scenario.title, () => {
				it('should result in the expected forgers list', async () => {
					// Forger selection relies on vote weight to be sorted
					const delegates = [
						...scenario.testCases.input.voteWeights.map(d => ({
							address: Buffer.from(d.address, 'hex'),
							voteWeight: BigInt(d.voteWeight),
						})),
					];
					delegates.sort((a, b) => {
						const diff = b.voteWeight - a.voteWeight;
						if (diff > BigInt(0)) {
							return 1;
						}
						if (diff < BigInt(0)) {
							return -1;
						}
						return a.address.compare(b.address);
					});

					const encodedDelegateVoteWeights = codec.encode(voteWeightsSchema, {
						voteWeights: [
							{
								round: defaultRound,
								delegates: delegates.map(d => ({
									address: d.address,
									voteWeight: d.voteWeight,
								})),
							},
						],
					});

					stateStore = new StateStoreMock([], {
						[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: encodedDelegateVoteWeights,
					});
					await delegateList.updateForgersList(
						defaultRound,
						[
							Buffer.from(scenario.testCases.input.randomSeed1, 'hex'),
							Buffer.from(scenario.testCases.input.randomSeed2, 'hex'),
						],
						stateStore,
					);

					const forgersListBuffer = await stateStore.consensus.get(
						CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
					);

					const { forgersList } = codec.decode(
						forgerListSchema,
						forgersListBuffer as Buffer,
					);

					expect(forgersList).toHaveLength(1);
					expect(forgersList[0].round).toEqual(defaultRound);

					const sortedFixturesForgersBuffer = Buffer.concat(
						scenario.testCases.output.selectedForgers
							.map(aForger => Buffer.from(aForger, 'hex'))
							.sort((a, b) => a.compare(b)),
					);

					expect(
						Buffer.concat(
							forgersList[0].delegates.sort((a: Buffer, b: Buffer) =>
								a.compare(b),
							),
						).compare(sortedFixturesForgersBuffer),
					).toEqual(0);
				});
			});
		}
	});

	describe('when there are enough standby delegates', () => {
		const defaultRound = 123;

		let delegates: { address: Buffer; voteWeight: bigint }[];

		beforeEach(async () => {
			const scenario = forgerSelectionMoreThan2StandByScenario;
			// Forger selection relies on vote weight to be sorted
			delegates = [
				...scenario.testCases.input.voteWeights.map(d => ({
					address: Buffer.from(d.address, 'hex'),
					voteWeight: BigInt(d.voteWeight),
				})),
			];
			delegates.sort((a, b) => {
				const diff = BigInt(b.voteWeight) - BigInt(a.voteWeight);
				if (diff > BigInt(0)) {
					return 1;
				}
				if (diff < BigInt(0)) {
					return -1;
				}
				return a.address.compare(b.address);
			});

			const encodedDelegateVoteWeights = codec.encode(voteWeightsSchema, {
				voteWeights: [
					{
						round: defaultRound,
						delegates: delegates.map(d => ({
							address: d.address,
							voteWeight: d.voteWeight,
						})),
					},
				],
			});

			stateStore = new StateStoreMock([], {
				[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: encodedDelegateVoteWeights,
			});
			await delegateList.updateForgersList(
				defaultRound,
				[
					Buffer.from(scenario.testCases.input.randomSeed1, 'hex'),
					Buffer.from(scenario.testCases.input.randomSeed2, 'hex'),
				],
				stateStore,
			);
		});

		it('should have 103 delegate addresses in the forgers list', async () => {
			const forgersListBuffer = await stateStore.consensus.get(
				CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
			);

			const { forgersList } = codec.decode(
				forgerListSchema,
				forgersListBuffer as Buffer,
			);
			expect(forgersList[0].delegates).toHaveLength(103);
		});

		it('should store selected stand by delegates in the forgers list', async () => {
			const forgersListBuffer = await stateStore.consensus.get(
				CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
			);

			const { forgersList } = codec.decode(
				forgerListSchema,
				forgersListBuffer as Buffer,
			);

			const standByCandidates = delegates.slice(101).map(d => d.address);
			expect(forgersList[0].standby).toHaveLength(2);
			for (const standby of forgersList[0].standby) {
				const standByInDelegateFound = searchBufferArray(
					standby,
					forgersList[0].delegates,
				);
				expect(standByInDelegateFound).toBe(true);
				const standByCandidatesFound = searchBufferArray(
					standby,
					standByCandidates,
				);
				expect(standByCandidatesFound).toBe(true);
			}
		});
	});
});
