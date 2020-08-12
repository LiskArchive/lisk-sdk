/*
 * Copyright © 2018 Lisk Foundation
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

import { codec } from '@liskhq/lisk-codec';
import { dataStructures } from '@liskhq/lisk-utils';
import {
	Chain,
	CONSENSUS_STATE_VALIDATORS_KEY,
	validatorsSchema,
	Validator,
	BlockHeader,
} from '@liskhq/lisk-chain';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import * as scenario4DelegatesMissedSlots from '../bft_specs/4_delegates_missed_slots.json';
import * as scenario4DelegatesSimple from '../bft_specs/4_delegates_simple.json';
import * as scenario5DelegatesSwitchedCompletely from '../bft_specs/5_delegates_switched_completely.json';
import * as scenario7DelegatesPartialSwitch from '../bft_specs/7_delegates_partial_switch.json';
import * as scenario11DelegatesPartialSwitch from '../bft_specs/11_delegates_partial_switch.json';
import {
	FinalityManager,
	CONSENSUS_STATE_VALIDATOR_LEDGER_KEY,
	VotingLedger,
	BFTVotingLedgerSchema,
} from '../../src/finality_manager';
import { StateStoreMock } from '../utils/state_store_mock';
import { convertHeader } from '../fixtures/blocks';

const bftScenarios = [
	scenario4DelegatesMissedSlots,
	scenario4DelegatesSimple,
	scenario5DelegatesSwitchedCompletely,
	scenario7DelegatesPartialSwitch,
	scenario11DelegatesPartialSwitch,
];

const preVotesAndCommits = async (stateStore: StateStoreMock) => {
	const delegateLedgerBuffer = await stateStore.consensus.get(CONSENSUS_STATE_VALIDATOR_LEDGER_KEY);

	const delegateLedger = codec.decode<VotingLedger>(
		BFTVotingLedgerSchema,
		(delegateLedgerBuffer as unknown) as Buffer,
	);

	const preCommits = delegateLedger.ledger.reduce((acc: any, curr) => {
		if (curr.preCommits > 0) {
			acc[curr.height] = curr.preCommits;
		}
		return acc;
	}, {});

	const preVotes = delegateLedger.ledger.reduce((acc: any, curr) => {
		if (curr.preVotes > 0) {
			acc[curr.height] = curr.preVotes;
		}
		return acc;
	}, {});

	return { preCommits, preVotes };
};

describe('FinalityManager', () => {
	let chainStub: Chain;
	let stateStore: StateStoreMock;

	describe('addBlockHeader', () => {
		for (const scenario of bftScenarios) {
			// eslint-disable-next-line no-loop-func
			describe(`when running scenario "${scenario.handler}"`, () => {
				let finalityManager: FinalityManager;

				beforeAll(() => {
					chainStub = ({
						slots: {
							getSlotNumber: jest.fn(),
							isWithinTimeslot: jest.fn(),
							timeSinceGenesis: jest.fn(),
						},
						dataAccess: {
							getConsensusState: jest.fn(),
						},
						numberOfValidators: scenario.config.activeDelegates,
					} as unknown) as Chain;

					finalityManager = new FinalityManager({
						chain: chainStub,
						finalizedHeight: scenario.config.finalizedHeight,
						threshold: Math.floor((scenario.config.activeDelegates * 2) / 3) + 1,
					});

					stateStore = new StateStoreMock();

					const blockHeaders = (scenario.testCases as any).map((tc: any) =>
						convertHeader(tc.input.blockHeader),
					);
					blockHeaders.sort((a: any, b: any) => b.height - a.height);
				});

				for (const testCase of scenario.testCases) {
					// eslint-disable-next-line no-loop-func
					it(`should have accurate information when ${testCase.input.delegateName} forge block at height = ${testCase.input.blockHeader.height}`, async () => {
						// Arrange
						const blockHeaders: BlockHeader[] = [];
						const validatorsMap = new dataStructures.BufferMap<Validator>();
						for (const tc of scenario.testCases) {
							blockHeaders.push(convertHeader(tc.input.blockHeader));
							if (tc.input.blockHeader.height <= testCase.input.blockHeader.height) {
								const addr = getAddressFromPublicKey(
									Buffer.from(tc.input.blockHeader.generatorPublicKey, 'hex'),
								);
								validatorsMap.set(addr, {
									address: addr,
									isConsensusParticipant: true,
									minActiveHeight: tc.input.blockHeader.delegateMinHeightActive,
								});
							}
						}
						blockHeaders.sort((a: any, b: any) => b.height - a.height);
						const filteredBlockHeaders = blockHeaders.filter(
							(bh: any) => bh.height < testCase.input.blockHeader.height,
						);

						stateStore.consensus.set(
							CONSENSUS_STATE_VALIDATORS_KEY,
							codec.encode(validatorsSchema, { validators: validatorsMap.values() }),
						);
						stateStore.chain.lastBlockHeaders = filteredBlockHeaders;

						// Act
						await finalityManager.addBlockHeader(
							convertHeader(testCase.input.blockHeader),
							stateStore,
						);

						// Arrange &  Assert
						const { preCommits, preVotes } = await preVotesAndCommits(stateStore);
						const expectedPreCommits: any = { ...testCase.output.preCommits };

						Object.keys(expectedPreCommits)
							.filter(
								height =>
									parseInt(height, 10) <=
									testCase.input.blockHeader.height - finalityManager.maxHeaders,
							)
							.forEach(key => {
								delete expectedPreCommits[key];
							});

						expect(preCommits).toEqual(expectedPreCommits);

						expect(preVotes).toEqual(testCase.output.preVotes);

						expect(finalityManager.finalizedHeight).toEqual(testCase.output.finalizedHeight);

						const updatedBftLedgers = await stateStore.consensus.get(
							CONSENSUS_STATE_VALIDATOR_LEDGER_KEY,
						);
						const { ledger } = finalityManager['_decodeVotingLedger'](updatedBftLedgers);
						const { preVoted } = finalityManager['_getChainMaxHeightStatus'](ledger);
						expect(preVoted).toEqual(testCase.output.preVotedConfirmedHeight);
					});
				}
			});
		}
	});
});
