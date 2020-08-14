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

import { BlockHeader, Account } from '@liskhq/lisk-chain';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { testing } from '@liskhq/lisk-utils';
import { getAddressAndPublicKeyFromPassphrase, hexToBuffer } from '@liskhq/lisk-cryptography';
import * as delegateShufflingScenario from '../../../../fixtures/dpos_delegate_shuffling/uniformly_shuffled_delegate_list.json';
import { shuffleDelegateList, updateProductivity } from '../../../../../src/modules/dpos/delegates';
import { Delegate } from '../../../../../src';
import {
	DelegateAccountsWithPublicKeysMap,
	getDelegateAccounts,
} from '../../../../fixtures/delegates';
import { DPOSAccountProps } from '../../../../../src/modules/dpos';

const { StateStoreMock } = testing;

describe('delegates', () => {
	describe('shuffleDelegateList', () => {
		const { previousRoundSeed1 } = delegateShufflingScenario.testCases.input;
		const addressList = [...delegateShufflingScenario.testCases.input.delegateList].map(address =>
			Buffer.from(address, 'hex'),
		);
		it('should return a list of uniformly shuffled list of delegates', () => {
			const shuffledDelegateList = shuffleDelegateList(
				hexToBuffer(previousRoundSeed1),
				addressList,
			);

			expect(shuffledDelegateList).toHaveLength(addressList.length);
			shuffledDelegateList.forEach(address =>
				expect(addressList.map(a => a.toString('hex'))).toContain(address.toString('hex')),
			);

			expect(shuffledDelegateList.map(b => b.toString('hex'))).toEqual(
				delegateShufflingScenario.testCases.output.delegateList,
			);
		});
	});

	describe('updateProductivity', () => {
		let accountsPublicKeys: DelegateAccountsWithPublicKeysMap;
		let forgedDelegates: Account<DPOSAccountProps>[];
		let forgersList: Delegate[];
		let params: any;

		beforeEach(() => {
			accountsPublicKeys = getDelegateAccounts(103);
			forgedDelegates = accountsPublicKeys.accounts;
			forgersList = [
				...forgedDelegates.map(d => ({ address: d.address, isConsensusParticipant: true })),
			];

			params = {
				height: 8976,
				blockTime: 10,
				generatorPublicKey: getAddressAndPublicKeyFromPassphrase(Mnemonic.generateMnemonic()),
				blockTimestamp: Date.now() / 1000,
				stateStore: new StateStoreMock({ accounts: accountsPublicKeys.accounts }),
				consensus: {
					getLastBootstrapHeight: jest.fn().mockReturnValue(5),
					getFinalizedHeight: jest.fn().mockReturnValue(0),
					getDelegates: jest.fn(),
					updateDelegates: jest.fn(),
				},
			};

			params.consensus.getDelegates.mockReturnValue(forgersList);
		});

		describe('When only 1 delegate forged since last block', () => {
			// eslint-disable-next-line jest/expect-expect
			it('should increment "consecutiveMissedBlocks" for every forgers except forging delegate', async () => {
				// Arrange
				const forgedDelegate = forgedDelegates[forgedDelegates.length - 1];
				const lastBlock = {
					generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
					height: 926,
					timestamp: 9260,
				} as BlockHeader;
				params.stateStore.chain.lastBlockHeaders = [lastBlock];
				params = {
					...params,
					height: 927,
					blockTimestamp: 10290,
					generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
				};

				// Act
				await updateProductivity(params);

				// Assert
				expect.assertions(forgedDelegates.length + 1);
				for (const delegate of forgedDelegates) {
					const updatedAccount = await params.stateStore.account.get(delegate.address);
					if (delegate.address.equals(forgedDelegate.address)) {
						expect(updatedAccount.dpos.delegate.consecutiveMissedBlocks).toEqual(0);
					} else {
						expect(updatedAccount.dpos.delegate.consecutiveMissedBlocks).toEqual(1);
					}
				}
				const forger = await params.stateStore.account.get(forgedDelegate.address);
				expect(forger.dpos.delegate.lastForgedHeight).toEqual(params.height);
			});
		});

		describe('When only 2 delegate missed a block since last block', () => {
			it('should increment "consecutiveMissedBlocks" only for forgers who missed a block', async () => {
				// Arrange
				const forgedDelegate = forgedDelegates[forgedDelegates.length - 1];
				const missedDelegate = [
					forgedDelegates[forgedDelegates.length - 2],
					forgedDelegates[forgedDelegates.length - 3],
				];
				const lastBlock = {
					generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
					height: 926,
					timestamp: 10260,
				} as BlockHeader;
				params.stateStore.chain.lastBlockHeaders = [lastBlock];
				params = {
					...params,
					height: 927,
					blockTimestamp: 10290,
					generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
				};

				await updateProductivity(params);

				expect.assertions(forgedDelegates.length);
				for (const delegate of forgedDelegates) {
					const updatedAccount = await params.stateStore.account.get(delegate.address);
					if (
						missedDelegate.some(missedAccount => missedAccount.address.equals(delegate.address))
					) {
						expect(updatedAccount.dpos.delegate.consecutiveMissedBlocks).toEqual(1);
					} else {
						expect(updatedAccount.dpos.delegate.consecutiveMissedBlocks).toEqual(0);
					}
				}
			});
		});

		describe('When delegate missed more than 1 blocks since last block', () => {
			it('should increment "consecutiveMissedBlocks"  for the number of blocks that delegate missed ', async () => {
				// Arrange
				const forgerIndex = forgedDelegates.length - 1;
				const forgedDelegate = forgedDelegates[forgerIndex];
				const missedMoreThan1Delegates = forgedDelegates.slice(forgerIndex - 5, forgerIndex);
				const lastBlock = {
					generatorPublicKey: accountsPublicKeys.publicKeyMap.get(
						forgedDelegates[forgerIndex - 6].address,
					),
					height: 926,
					timestamp: 9200,
				} as BlockHeader;
				params.stateStore.chain.lastBlockHeaders = [lastBlock];
				params = {
					...params,
					height: 927,
					blockTimestamp: 10290,
					generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
				};

				// Act
				await updateProductivity(params);

				expect.assertions(forgedDelegates.length);
				for (const delegate of forgedDelegates) {
					const updatedAccount = await params.stateStore.account.get(delegate.address);
					if (delegate.address.equals(forgedDelegate.address)) {
						expect(updatedAccount.dpos.delegate.consecutiveMissedBlocks).toEqual(0);
					} else if (
						missedMoreThan1Delegates.some(missedAccount =>
							missedAccount.address.equals(delegate.address),
						)
					) {
						expect(updatedAccount.dpos.delegate.consecutiveMissedBlocks).toEqual(2);
					} else {
						expect(updatedAccount.dpos.delegate.consecutiveMissedBlocks).toEqual(1);
					}
				}
			});
		});

		describe('When all delegates successfully forges a block', () => {
			it('should NOT update "consecutiveMissedBlocks" for anyone', async () => {
				// Arrange
				const lastBlock = {
					generatorPublicKey: accountsPublicKeys.publicKeyMap.get(
						forgedDelegates[forgedDelegates.length - 2].address,
					),
					height: 926,
					timestamp: 10283,
				} as BlockHeader;
				params.stateStore.chain.lastBlockHeaders = [lastBlock];
				params = {
					...params,
					height: 927,
					blockTimestamp: 10290,
					generatorPublicKey: accountsPublicKeys.publicKeyMap.get(
						forgedDelegates[forgedDelegates.length - 1].address,
					),
				};

				await updateProductivity(params);

				expect.assertions(forgedDelegates.length + 1);
				for (const delegate of forgedDelegates) {
					const updatedAccount = await params.stateStore.account.get(delegate.address);
					expect(updatedAccount.dpos.delegate.consecutiveMissedBlocks).toEqual(0);
				}
				const forger = await params.stateStore.account.get(
					forgedDelegates[forgedDelegates.length - 1].address,
				);
				expect(forger.dpos.delegate.lastForgedHeight).toEqual(params.height);
			});
		});

		describe('when forger missed a block has 50 consecutive missed block, but forged within 260k blocks', () => {
			it('should not ban the missed forger', async () => {
				// Arrange
				const forgerIndex = forgedDelegates.length - 1;
				const forgedDelegate = forgedDelegates[forgerIndex];
				const missedDelegate = forgedDelegates[forgerIndex - 1];
				const lastBlock = {
					generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
					height: 920006,
					timestamp: 10000270,
				} as BlockHeader;
				params = {
					...params,
					height: 920007,
					blockTimestamp: 10000290,
					generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
				};
				params.stateStore = new StateStoreMock({
					accounts: [
						...forgedDelegates.map(forger => {
							if (forger.address.equals(missedDelegate.address)) {
								// eslint-disable-next-line no-param-reassign
								forger.dpos.delegate.lastForgedHeight = params.height - 260000 + 5000;
								// eslint-disable-next-line no-param-reassign
								forger.dpos.delegate.consecutiveMissedBlocks = 50;
							}
							return forger;
						}),
					],
					lastBlockHeaders: [lastBlock],
				});

				// Act
				await updateProductivity(params);

				const updatedMissedForger = await params.stateStore.account.get(missedDelegate.address);
				expect(updatedMissedForger.dpos.delegate.isBanned).toBeFalse();
				expect(updatedMissedForger.dpos.delegate.consecutiveMissedBlocks).toEqual(51);
			});
		});

		describe('when forger missed a block has not forged within 260k blocks, but does not have 50 consecutive missed block', () => {
			it('should not ban the missed forger', async () => {
				// Arrange
				const forgerIndex = forgedDelegates.length - 1;
				const forgedDelegate = forgedDelegates[forgerIndex];
				const missedDelegate = forgedDelegates[forgerIndex - 1];
				const lastBlock = {
					generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
					height: 920006,
					timestamp: 10000270,
				} as BlockHeader;
				params = {
					...params,
					height: 920007,
					blockTimestamp: 10000290,
					generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
				};
				params.stateStore = new StateStoreMock({
					accounts: [
						...forgedDelegates.map(forger => {
							if (forger.address.equals(missedDelegate.address)) {
								// eslint-disable-next-line no-param-reassign
								forger.dpos.delegate.lastForgedHeight = params.height - 260000 - 1;
								// eslint-disable-next-line no-param-reassign
								forger.dpos.delegate.consecutiveMissedBlocks = 40;
							}
							return forger;
						}),
					],
					lastBlockHeaders: [lastBlock],
				});

				// Act
				await updateProductivity(params);

				const updatedMissedForger = await params.stateStore.account.get(missedDelegate.address);
				expect(updatedMissedForger.dpos.delegate.isBanned).toBeFalse();
				expect(updatedMissedForger.dpos.delegate.consecutiveMissedBlocks).toEqual(41);
			});
		});

		describe('when forger missed a block has 50 consecutive missed block, and not forged within 260k blocks', () => {
			it('should ban the missed forger', async () => {
				// Arrange
				const forgerIndex = forgedDelegates.length - 1;
				const forgedDelegate = forgedDelegates[forgerIndex];
				const missedDelegate = forgedDelegates[forgerIndex - 1];
				const lastBlock = {
					generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
					height: 920006,
					timestamp: 10000270,
				} as BlockHeader;
				params = {
					...params,
					height: 920007,
					blockTimestamp: 10000290,
					generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
				};
				params.stateStore = new StateStoreMock({
					accounts: [
						...forgedDelegates.map(forger => {
							if (forger.address.equals(missedDelegate.address)) {
								// eslint-disable-next-line no-param-reassign
								forger.dpos.delegate.lastForgedHeight = params.height - 260000 - 1;
								// eslint-disable-next-line no-param-reassign
								forger.dpos.delegate.consecutiveMissedBlocks = 50;
							}
							return forger;
						}),
					],
					lastBlockHeaders: [lastBlock],
				});

				// Act
				await updateProductivity(params);

				const updatedMissedForger = await params.stateStore.account.get(missedDelegate.address);
				expect(updatedMissedForger.dpos.delegate.isBanned).toBeTrue();
				expect(updatedMissedForger.dpos.delegate.consecutiveMissedBlocks).toEqual(51);
			});
		});
	});
});
