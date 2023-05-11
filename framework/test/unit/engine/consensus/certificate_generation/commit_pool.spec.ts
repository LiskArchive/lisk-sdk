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

import { InMemoryDatabase, NotFoundError } from '@liskhq/lisk-db';
import { BlockHeader, StateStore } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { bls, utils } from '@liskhq/lisk-cryptography';
import * as crypto from '@liskhq/lisk-cryptography';
import { when } from 'jest-when';
import { BFTParameterNotFoundError } from '../../../../../src/engine/bft/errors';
import { CommitPool } from '../../../../../src/engine/consensus/certificate_generation/commit_pool';
import {
	EMPTY_BUFFER,
	COMMIT_RANGE_STORED,
	MESSAGE_TAG_CERTIFICATE,
	NETWORK_EVENT_COMMIT_MESSAGES,
} from '../../../../../src/engine/consensus/certificate_generation/constants';
import {
	certificateSchema,
	singleCommitSchema,
	singleCommitsNetworkPacketSchema,
} from '../../../../../src/engine/consensus/certificate_generation/schema';
import {
	SingleCommit,
	UnsignedCertificate,
} from '../../../../../src/engine/consensus/certificate_generation/types';
import { createFakeBlockHeader } from '../../../../../src/testing';
import {
	computeUnsignedCertificateFromBlockHeader,
	signCertificate,
} from '../../../../../src/engine/consensus/certificate_generation/utils';
import { AggregateCommit } from '../../../../../src/engine/consensus/types';
import { COMMIT_SORT } from '../../../../../src/engine/consensus/certificate_generation/commit_list';

jest.mock('@liskhq/lisk-cryptography', () => ({
	__esModule: true,
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('CommitPool', () => {
	const chainID = Buffer.alloc(0);
	const networkMock = {
		send: jest.fn(),
	};

	let commitPool: CommitPool;
	let bftMethod: any;
	let blockTime: number;
	let minCertifyHeight: number;
	let chain: any;
	let network: any;
	let getBlockHeaderByHeight: any;

	beforeEach(() => {
		bftMethod = {
			getValidator: jest.fn(),
			getBFTHeights: jest.fn(),
			getBFTParameters: jest.fn(),
			getNextHeightBFTParameters: jest.fn(),
			selectAggregateCommit: jest.fn(),
			existBFTParameters: jest.fn(),
		};

		blockTime = 10;
		minCertifyHeight = 0;

		getBlockHeaderByHeight = jest.fn();

		chain = {
			lastBlock: {
				header: { height: 1100 },
			},
			chainID,
			dataAccess: {
				getBlockHeaderByHeight,
			},
		};

		network = networkMock;

		commitPool = new CommitPool({
			bftMethod,
			blockTime,
			minCertifyHeight,
			chain,
			network,
			db: jest.fn() as any,
		});
	});

	describe('constructor', () => {
		it.todo('');
	});

	describe('job', () => {
		const dbMock = {
			get: jest.fn(),
			put: jest.fn(),
			batch: jest.fn(),
		};
		const blockID = utils.getRandomBytes(32);
		const height = 1020;
		const maxHeightCertified = 950;
		const maxHeightPrecommitted = 1000;
		const numActiveValidators = 103;
		const staleGossipedCommit = {
			blockID,
			certificateSignature: utils.getRandomBytes(96),
			height: maxHeightCertified - 1,
			validatorAddress: utils.getRandomBytes(20),
		};

		const staleNonGossipedCommit = {
			blockID,
			certificateSignature: utils.getRandomBytes(96),
			height: maxHeightCertified - 1,
			validatorAddress: utils.getRandomBytes(20),
		};

		let nonGossipedCommits: SingleCommit[];
		let gossipedCommits: SingleCommit[];

		beforeEach(() => {
			nonGossipedCommits = Array.from({ length: 5 }, () => ({
				blockID,
				certificateSignature: utils.getRandomBytes(96),
				height,
				validatorAddress: utils.getRandomBytes(20),
			}));

			gossipedCommits = Array.from({ length: 5 }, () => ({
				blockID,
				certificateSignature: utils.getRandomBytes(96),
				height,
				validatorAddress: utils.getRandomBytes(20),
			}));

			commitPool = new CommitPool({
				bftMethod,
				blockTime,
				minCertifyHeight,
				chain,
				network,
				db: dbMock as any,
			});

			gossipedCommits.forEach(commit => commitPool['_gossipedCommits'].add(commit));
			commitPool['_gossipedCommits'].add(staleGossipedCommit);
			// commitPool['_gossipedCommits'].set(staleGossipedCommit.height, [staleGossipedCommit]);
			nonGossipedCommits.forEach(commit => commitPool['_nonGossipedCommits'].add(commit));
			// commitPool['_nonGossipedCommits'].set(height, nonGossipedCommits);
			commitPool['_nonGossipedCommits'].add(staleNonGossipedCommit);
			(commitPool['_chain'] as any).finalizedHeight = maxHeightCertified;

			when(commitPool['_chain'].dataAccess.getBlockHeaderByHeight as any)
				.calledWith(maxHeightCertified)
				.mockResolvedValue({ aggregateCommit: { height: maxHeightCertified } } as never);

			commitPool['_bftMethod'].getBFTHeights = jest
				.fn()
				.mockResolvedValue({ maxHeightPrecommitted });
			commitPool['_bftMethod'].getBFTParameters = jest.fn().mockResolvedValue({
				validators: Array.from({ length: numActiveValidators }, () => utils.getRandomBytes(32)),
			});
		});

		it('should clean all the commits from nonGossipedCommit list with height below removal height', async () => {
			// Assert
			expect(commitPool['_nonGossipedCommits'].getAll()).toHaveLength(6);
			// Arrange
			commitPool['_bftMethod'].existBFTParameters = jest.fn().mockResolvedValue(true);
			const context = new StateStore(new InMemoryDatabase());
			// Act
			await commitPool['_job'](context);
			// Assert
			// nonGossiped commits are moved to gossiped commits and stale commit is deleted
			expect(commitPool['_nonGossipedCommits'].getAll()).toHaveLength(0);
		});

		it('should move/delete commits in gossipedCommit list with height below removal height', async () => {
			// Assert
			expect(commitPool['_gossipedCommits'].getAll()).toHaveLength(6);
			// Arrange
			commitPool['_bftMethod'].existBFTParameters = jest.fn().mockResolvedValue(true);
			const context = new StateStore(new InMemoryDatabase());
			// Act
			await commitPool['_job'](context);
			// Assert
			// nonGossiped commits are moved to gossiped commits
			expect(commitPool['_gossipedCommits'].getAll()).toHaveLength(10);
			// Should delete stale commit from gossipedList
			expect(commitPool['_gossipedCommits'].exists(staleGossipedCommit)).toBeFalse();
		});

		it('should clean all the commits from nonGossipedCommit that does not have bftParams change and height is in the future', async () => {
			// Update current height so that commits will always be in the future
			chain.lastBlock = { header: { height: 1019 } };
			// it should not be deleted by the height
			commitPool['_nonGossipedCommits'].add({
				blockID: utils.getRandomBytes(32),
				certificateSignature: utils.getRandomBytes(96),
				height: 1070,
				validatorAddress: utils.getRandomBytes(20),
			});
			commitPool['_gossipedCommits'].add({
				blockID: utils.getRandomBytes(32),
				certificateSignature: utils.getRandomBytes(96),
				height: 1070,
				validatorAddress: utils.getRandomBytes(20),
			});
			// Assert
			expect(commitPool['_nonGossipedCommits'].getAll()).toHaveLength(7);
			// Arrange
			const bftParamsMock = jest.fn();
			commitPool['_bftMethod'].existBFTParameters = bftParamsMock;
			const context = new StateStore(new InMemoryDatabase());
			when(bftParamsMock).calledWith(context, 1071).mockResolvedValue(false);
			when(bftParamsMock).calledWith(context, maxHeightCertified).mockResolvedValue(true);
			when(bftParamsMock)
				.calledWith(context, height + 1)
				.mockResolvedValue(true);
			// Act
			await commitPool['_job'](context);
			// Assert
			// nonGossiped commits are moved to gossiped commits
			expect(commitPool['_nonGossipedCommits'].getAll()).toHaveLength(0);
			expect(commitPool['_gossipedCommits'].getAll()).toHaveLength(10);
			expect(commitPool['_nonGossipedCommits'].getByHeight(1070)).toBeArrayOfSize(0);
			expect(commitPool['_gossipedCommits'].getByHeight(1070)).toBeArrayOfSize(0);
		});

		it('should select non gossiped commits that are created by the generator of the engine', async () => {
			// Arrange
			const generatorAddress = utils.getRandomBytes(20);
			commitPool.addCommit(
				{
					blockID: utils.getRandomBytes(32),
					certificateSignature: utils.getRandomBytes(96),
					height: 1070,
					validatorAddress: generatorAddress,
				},
				true,
			);
			// Added to nonGossipedCommitsLocal
			expect(commitPool['_nonGossipedCommitsLocal'].getAll()).toHaveLength(1);
			commitPool.addCommit({
				blockID: utils.getRandomBytes(32),
				certificateSignature: utils.getRandomBytes(96),
				height: 1070,
				validatorAddress: utils.getRandomBytes(20),
			});
			// Assert
			expect(commitPool['_gossipedCommits'].getAll()).toHaveLength(6);
			// Arrange
			commitPool['_bftMethod'].existBFTParameters = jest.fn().mockResolvedValue(true);
			const context = new StateStore(new InMemoryDatabase());
			// Act
			await commitPool['_job'](context);
			// Assert
			// nonGossiped commits are moved to gossiped commits
			expect(commitPool['_nonGossipedCommits'].getAll()).toHaveLength(0);
			expect(commitPool['_gossipedCommits'].getAll()).toHaveLength(12);
			expect(commitPool['_nonGossipedCommits'].getByHeight(1070)).toBeArrayOfSize(0);
			const commits = commitPool['_gossipedCommits'].getByHeight(1070);
			expect(commits).toBeDefined();
			expect(commits).toBeArray();
			const generatorCommit = commits?.find(c => c.validatorAddress.equals(generatorAddress));
			expect(generatorCommit).toBeDefined();
			expect(generatorCommit?.validatorAddress).toEqual(generatorAddress);
		});

		it('should not have selected commits length more than 2 * numActiveValidators', async () => {
			const maxHeightPrecommittedTest = 1090;
			const commitHeight = 980;
			const getSelectedCommits = (cp: CommitPool) => {
				const selectedCommits = [];
				const maxSelectedCommitsLength = 2 * numActiveValidators;
				const commits = cp['_getAllCommits']();

				for (const commit of commits) {
					if (selectedCommits.length >= maxSelectedCommitsLength) {
						break;
					}
					// 2.1 Choosing the commit with smaller height first
					if (commit.height < maxHeightPrecommittedTest - COMMIT_RANGE_STORED) {
						selectedCommits.push(commit);
					}
				}

				const sortedNonGossipedCommits = cp['_nonGossipedCommits'].getAll(COMMIT_SORT.DSC);
				const sortedNonGossipedCommitsLocal = cp['_nonGossipedCommitsLocal'].getAll(
					COMMIT_SORT.DSC,
				);

				for (const commit of sortedNonGossipedCommitsLocal) {
					if (selectedCommits.length >= maxSelectedCommitsLength) {
						break;
					}
					selectedCommits.push(commit);
				}
				// 2.3 Select newly received commits by others
				for (const commit of sortedNonGossipedCommits) {
					if (selectedCommits.length >= maxSelectedCommitsLength) {
						break;
					}
					selectedCommits.push(commit);
				}

				return selectedCommits.map(commit => codec.encode(singleCommitSchema, commit));
			};
			commitPool['_nonGossipedCommits']
				.getAll()
				.forEach(c => commitPool['_nonGossipedCommits'].deleteSingle(c));
			commitPool['_gossipedCommits']
				.getAll()
				.forEach(c => commitPool['_gossipedCommits'].deleteSingle(c));

			Array.from({ length: 105 }, () => ({
				blockID,
				certificateSignature: utils.getRandomBytes(96),
				height: commitHeight,
				validatorAddress: utils.getRandomBytes(20),
			})).forEach(c => commitPool['_nonGossipedCommits'].add(c));

			Array.from({ length: 105 }, () => ({
				blockID,
				certificateSignature: utils.getRandomBytes(96),
				height: commitHeight,
				validatorAddress: utils.getRandomBytes(20),
			})).forEach(c => commitPool['_gossipedCommits'].add(c));

			expect(commitPool['_nonGossipedCommits'].getAll()).toHaveLength(105);
			expect(commitPool['_gossipedCommits'].getAll()).toHaveLength(105);

			// Arrange
			commitPool['_bftMethod'].existBFTParameters = jest.fn().mockResolvedValue(true);
			commitPool['_bftMethod'].getBFTHeights = jest
				.fn()
				.mockResolvedValue({ maxHeightPrecommitted: maxHeightPrecommittedTest });
			const context = new StateStore(new InMemoryDatabase());
			const selectedCommitsToGossip = getSelectedCommits(commitPool);
			// Act
			await commitPool['_job'](context);
			// Assert
			expect(selectedCommitsToGossip).toHaveLength(2 * numActiveValidators);
			expect(networkMock.send).toHaveBeenCalledWith({
				event: NETWORK_EVENT_COMMIT_MESSAGES,
				data: codec.encode(singleCommitsNetworkPacketSchema, { commits: selectedCommitsToGossip }),
			});
		});

		it('should call network send when the job runs', async () => {
			// Arrange
			commitPool['_bftMethod'].existBFTParameters = jest.fn().mockResolvedValue(true);
			const context = new StateStore(new InMemoryDatabase());
			// Act
			await commitPool['_job'](context);
			// Assert
			expect(networkMock.send).toHaveBeenCalledTimes(1);
		});

		it('should not increase the size of gosspedCommits when all gossipedCommits are selected to broadcast', async () => {
			for (const commit of nonGossipedCommits) {
				commitPool['_nonGossipedCommits'].deleteSingle(commit);
			}
			// make all gossipedCommits selected for condition 2.1.
			commitPool['_bftMethod'].getBFTHeights = jest
				.fn()
				.mockResolvedValue({ maxHeightPrecommitted: height + COMMIT_RANGE_STORED + 1 });
			// Assert
			expect(commitPool['_gossipedCommits'].getAll()).toHaveLength(6);
			// Arrange
			commitPool['_bftMethod'].existBFTParameters = jest.fn().mockResolvedValue(true);
			const context = new StateStore(new InMemoryDatabase());
			// Act
			await commitPool['_job'](context);
			// Assert
			// one stale gossiped commit should be removed, and remaining 5 should be kept in the pool.
			expect(commitPool['_gossipedCommits'].getAll()).toHaveLength(5);
		});
	});

	describe('addCommit', () => {
		let nonGossipedCommits: SingleCommit[];
		let height: number;

		beforeEach(() => {
			const blockID = utils.getRandomBytes(32);

			height = 1031;

			nonGossipedCommits = [
				{
					blockID,
					certificateSignature: utils.getRandomBytes(96),
					height,
					validatorAddress: utils.getRandomBytes(20),
				},
			];

			// We add commits by .add() method because properties are readonly
			commitPool['_nonGossipedCommits'].add(nonGossipedCommits[0]);
		});

		it('should add commit successfully', () => {
			const newCommit: SingleCommit = {
				...nonGossipedCommits[0],
				certificateSignature: utils.getRandomBytes(96),
				validatorAddress: utils.getRandomBytes(20),
			};

			commitPool.addCommit(newCommit);

			expect(commitPool['_nonGossipedCommits'].getByHeight(height)).toEqual([
				nonGossipedCommits[0],
				newCommit,
			]);
		});

		it('should not set new single commit when it already exists', () => {
			const newCommit: SingleCommit = {
				...nonGossipedCommits[0],
			};
			jest.spyOn(commitPool['_nonGossipedCommits'], 'add');
			commitPool.addCommit(newCommit);

			expect(commitPool['_nonGossipedCommits'].add).toHaveBeenCalledTimes(0);
		});

		it('should add commit successfully for a non-existent height', () => {
			height += 1;
			const newCommit: SingleCommit = {
				...nonGossipedCommits[0],
				height,
				certificateSignature: utils.getRandomBytes(96),
				validatorAddress: utils.getRandomBytes(20),
			};

			commitPool.addCommit(newCommit);

			expect(commitPool['_nonGossipedCommits'].getByHeight(height)).toEqual([newCommit]);
		});
	});

	describe('validateCommit', () => {
		let stateStore: StateStore;
		let commit: SingleCommit;
		let blockHeader: BlockHeader;
		let blockHeaderOfFinalizedHeight: BlockHeader;
		let unsignedCertificate: UnsignedCertificate;
		let publicKey: Buffer;
		let privateKey: Buffer;
		let signature: Buffer;
		let maxHeightCertified: number;
		let maxHeightPrecommitted: number;
		let weights: number[];
		let threshold: number;
		let validators: any[];

		beforeEach(() => {
			maxHeightCertified = 1000;
			maxHeightPrecommitted = 1050;

			stateStore = new StateStore(new InMemoryDatabase());

			blockHeader = createFakeBlockHeader({
				height: 1031,
				timestamp: 10310,
				generatorAddress: utils.getRandomBytes(20),
			});

			blockHeaderOfFinalizedHeight = createFakeBlockHeader({
				aggregateCommit: {
					aggregationBits: Buffer.alloc(0),
					certificateSignature: Buffer.alloc(0),
					height: 1030,
				},
			});

			unsignedCertificate = computeUnsignedCertificateFromBlockHeader(blockHeader);

			privateKey = bls.generatePrivateKey(utils.getRandomBytes(32));
			publicKey = bls.getPublicKeyFromPrivateKey(privateKey);
			signature = signCertificate(privateKey, chainID, unsignedCertificate);

			commit = {
				blockID: blockHeader.id,
				certificateSignature: signature,
				height: blockHeader.height,
				validatorAddress: blockHeader.generatorAddress,
			};

			chain.finalizedHeight = commit.height - 1;

			weights = Array(103).fill(1);
			validators = weights.map(weight => ({
				address: utils.getRandomBytes(20),
				bftWeight: BigInt(weight),
				blsKey: utils.getRandomBytes(48),
			}));
			// Single commit owner must be an active validator
			validators[0] = {
				address: commit.validatorAddress,
				bftWeight: BigInt(1),
				blsKey: publicKey,
			};

			when(chain.dataAccess.getBlockHeaderByHeight)
				.calledWith(commit.height)
				.mockReturnValue(blockHeader);

			bftMethod.getBFTHeights.mockReturnValue({
				maxHeightCertified,
				maxHeightPrecommitted,
			});

			when(bftMethod.getBFTParameters).calledWith(stateStore, commit.height).mockReturnValue({
				certificateThreshold: threshold,
				validators,
			});

			when(bftMethod.getValidator)
				.calledWith(stateStore, commit.validatorAddress, commit.height)
				.mockReturnValue({ blsKey: publicKey });

			bftMethod.existBFTParameters.mockReturnValue(true);

			when(getBlockHeaderByHeight)
				.calledWith(chain.finalizedHeight)
				.mockReturnValue(blockHeaderOfFinalizedHeight);
		});

		it('should validate single commit successfully', async () => {
			const isCommitValid = await commitPool.validateCommit(stateStore, commit);

			expect(isCommitValid).toBeTrue();
		});

		it('should return false when single commit height is in the future', async () => {
			bftMethod.existBFTParameters.mockReturnValue(false);
			const isCommitValid = await commitPool.validateCommit(stateStore, {
				...commit,
				height: 2023,
			});

			expect(isCommitValid).toBeFalse();
		});

		it('should return false when single commit block id is not equal to chain block id at same height', async () => {
			when(chain.dataAccess.getBlockHeaderByHeight)
				.calledWith(commit.height)
				.mockReturnValue(createFakeBlockHeader({ id: utils.getRandomBytes(32) }));

			const isCommitValid = await commitPool.validateCommit(stateStore, commit);

			expect(isCommitValid).toBeFalse();
		});

		it('should return false when single commit exists in gossiped commits but not in non-gossipped commits', async () => {
			commitPool['_gossipedCommits'].add(commit);

			const isCommitValid = await commitPool.validateCommit(stateStore, commit);

			expect(isCommitValid).toBeFalse();
		});

		it('should return false when single commit exists in non-gossiped commits but not in gossipped commits', async () => {
			commitPool['_nonGossipedCommits'].add(commit);

			const isCommitValid = await commitPool.validateCommit(stateStore, commit);

			expect(isCommitValid).toBeFalse();
		});

		it('should return false when maxRemovalHeight is equal to single commit height', async () => {
			(blockHeaderOfFinalizedHeight.aggregateCommit.height as any) = 1031;

			const isCommitValid = await commitPool.validateCommit(stateStore, commit);

			expect(isCommitValid).toBeFalse();
		});

		it('should return false when maxRemovalHeight is above single commit height', async () => {
			(blockHeaderOfFinalizedHeight.aggregateCommit.height as any) = 1032;

			const isCommitValid = await commitPool.validateCommit(stateStore, commit);

			expect(isCommitValid).toBeFalse();
		});

		it('should return true when single commit height is below commit range but bft parameter exists for next height', async () => {
			maxHeightCertified = commit.height - 50 + COMMIT_RANGE_STORED + 1;
			maxHeightPrecommitted = commit.height + COMMIT_RANGE_STORED + 1;

			bftMethod.getBFTHeights.mockReturnValue({
				maxHeightCertified,
				maxHeightPrecommitted,
			});

			const isCommitValid = await commitPool.validateCommit(stateStore, commit);

			expect(isCommitValid).toBeTrue();
		});

		it('should return true when single commit height is above maxHeightPrecommited but bft parameter exists for next height', async () => {
			maxHeightCertified = commit.height - 50 - 1;
			maxHeightPrecommitted = commit.height - 1;

			bftMethod.getBFTHeights.mockReturnValue({
				maxHeightCertified,
				maxHeightPrecommitted,
			});

			const isCommitValid = await commitPool.validateCommit(stateStore, commit);

			expect(isCommitValid).toBeTrue();
		});

		it('should return true when bft parameter does not exist for next height but commit in range', async () => {
			when(bftMethod.existBFTParameters)
				.calledWith(stateStore, commit.height + 1)
				.mockReturnValue(false);

			const isCommitValid = await commitPool.validateCommit(stateStore, commit);

			expect(isCommitValid).toBeTrue();
		});

		it('should return false when bft parameter does not exist for next height and commit is below range', async () => {
			maxHeightCertified = commit.height - 50 + COMMIT_RANGE_STORED + 1;
			maxHeightPrecommitted = commit.height + COMMIT_RANGE_STORED + 1;

			bftMethod.getBFTHeights.mockReturnValue({
				maxHeightCertified,
				maxHeightPrecommitted,
			});

			when(bftMethod.existBFTParameters)
				.calledWith(stateStore, commit.height + 1)
				.mockReturnValue(false);

			const isCommitValid = await commitPool.validateCommit(stateStore, commit);

			expect(isCommitValid).toBeFalse();
		});

		it('should return false when bft parameter does not exist for next height and single commit height is above current height', async () => {
			maxHeightCertified = commit.height - 50 - 1;
			chain.lastBlock = { header: { height: commit.height - 1 } };

			bftMethod.getBFTHeights.mockReturnValue({
				maxHeightCertified,
				maxHeightPrecommitted,
			});

			when(bftMethod.existBFTParameters)
				.calledWith(stateStore, commit.height + 1)
				.mockReturnValue(false);

			const isCommitValid = await commitPool.validateCommit(stateStore, commit);

			expect(isCommitValid).toBeFalse();
		});

		it('should throw error when generator is not in active validators of the height', async () => {
			// Change generator to another random validator
			validators[0] = {
				address: utils.getRandomBytes(20),
				bftWeight: BigInt(1),
			};

			await expect(commitPool.validateCommit(stateStore, commit)).rejects.toThrow(
				'Commit validator was not active for its height.',
			);
		});

		it('should throw error when bls key of the validator is not matching with the certificate signature', async () => {
			when(bftMethod.getBFTParameters)
				.calledWith(stateStore, commit.height)
				.mockReturnValue({
					validators: [{ address: commit.validatorAddress, blsKey: utils.getRandomBytes(48) }],
				});

			await expect(commitPool.validateCommit(stateStore, commit)).rejects.toThrow(
				'Certificate signature is not valid.',
			);
		});
	});

	describe('getCommitsByHeight', () => {
		let nonGossipedCommits: SingleCommit[];
		let gossipedCommits: SingleCommit[];
		let height: number;

		beforeEach(() => {
			const blockID = utils.getRandomBytes(32);

			height = 1031;

			nonGossipedCommits = [
				{
					blockID,
					certificateSignature: utils.getRandomBytes(96),
					height,
					validatorAddress: utils.getRandomBytes(20),
				},
			];

			gossipedCommits = [
				{
					blockID,
					certificateSignature: utils.getRandomBytes(96),
					height,
					validatorAddress: utils.getRandomBytes(20),
				},
			];

			// We add commits by .set() method because properties are readonly
			commitPool['_nonGossipedCommits'].add(nonGossipedCommits[0]);
			commitPool['_gossipedCommits'].add(gossipedCommits[0]);
		});

		it('should get commits by height successfully', () => {
			const commitsByHeight = commitPool.getCommitsByHeight(height);

			expect(commitsByHeight).toEqual([...nonGossipedCommits, ...gossipedCommits]);
		});

		it('should return empty array for an empty height', () => {
			const commitsByHeight = commitPool.getCommitsByHeight(height + 1);

			expect(commitsByHeight).toEqual([]);
		});

		it('should return just gossiped commits when just gossiped commits set for that height', () => {
			height = 1032;
			gossipedCommits = [
				{
					blockID: utils.getRandomBytes(32),
					certificateSignature: utils.getRandomBytes(96),
					height,
					validatorAddress: utils.getRandomBytes(20),
				},
			];
			commitPool['_gossipedCommits'].add(gossipedCommits[0]);

			const commitsByHeight = commitPool.getCommitsByHeight(height);

			expect(commitsByHeight).toEqual([...gossipedCommits]);
		});

		it('should return just non-gossiped commits when just non-gossiped commits set for that height', () => {
			height = 1032;
			nonGossipedCommits = [
				{
					blockID: utils.getRandomBytes(32),
					certificateSignature: utils.getRandomBytes(96),
					height,
					validatorAddress: utils.getRandomBytes(20),
				},
			];
			commitPool['_nonGossipedCommits'].add(nonGossipedCommits[0]);

			const commitsByHeight = commitPool.getCommitsByHeight(height);

			expect(commitsByHeight).toEqual([...nonGossipedCommits]);
		});
	});

	describe('createSingleCommit', () => {
		const blockHeader = createFakeBlockHeader();
		const validatorInfo = {
			address: utils.getRandomBytes(20),
			blsPublicKey: utils.getRandomBytes(48),
			blsSecretKey: utils.getRandomBytes(32),
		};
		let unsignedCertificate: UnsignedCertificate;
		let expectedCommit: SingleCommit;

		beforeEach(() => {
			unsignedCertificate = computeUnsignedCertificateFromBlockHeader(blockHeader);
			expectedCommit = {
				blockID: blockHeader.id,
				height: blockHeader.height,
				validatorAddress: validatorInfo.address,
				certificateSignature: signCertificate(
					validatorInfo.blsSecretKey,
					chainID,
					unsignedCertificate,
				),
			};
		});

		it('should create a single commit', () => {
			expect(commitPool.createSingleCommit(blockHeader, validatorInfo, chainID)).toEqual(
				expectedCommit,
			);
		});
	});

	describe('verifyAggregateCommit', () => {
		let height: number;
		let maxHeightCertified: number;
		let maxHeightPrecommitted: number;
		let timestamp: number;
		let stateStore: StateStore;
		let aggregateCommit: AggregateCommit;
		let unsignedCertificate: UnsignedCertificate;
		let privateKeys: Buffer[];
		let publicKeys: Buffer[];
		let weights: number[];
		let threshold: number;
		let signatures: Buffer[];
		let pubKeySignaturePairs: { publicKey: Buffer; signature: Buffer }[];
		let certificateSignature: Buffer;
		let aggregationBits: Buffer;
		let validators: any;
		let blockHeader: BlockHeader;

		beforeEach(() => {
			height = 1030;
			maxHeightCertified = 1000;
			maxHeightPrecommitted = 1050;
			timestamp = 10300;

			blockHeader = createFakeBlockHeader({
				height,
				timestamp,
			});

			stateStore = new StateStore(new InMemoryDatabase());

			privateKeys = Array.from({ length: 103 }, _ =>
				bls.generatePrivateKey(utils.getRandomBytes(32)),
			);
			publicKeys = privateKeys.map(privateKey => bls.getPublicKeyFromPrivateKey(privateKey));

			weights = Array(103).fill(1);
			threshold = 33;

			unsignedCertificate = {
				blockID: blockHeader.id,
				height: blockHeader.height,
				stateRoot: blockHeader.stateRoot as Buffer,
				timestamp: blockHeader.timestamp,
				validatorsHash: blockHeader.validatorsHash as Buffer,
			};

			const encodedCertificate = codec.encode(certificateSchema, unsignedCertificate);

			signatures = privateKeys.map(privateKey =>
				bls.signData(MESSAGE_TAG_CERTIFICATE, chainID, encodedCertificate, privateKey),
			);

			pubKeySignaturePairs = Array.from({ length: 103 }, (_, i) => ({
				publicKey: publicKeys[i],
				signature: signatures[i],
			}));

			({ aggregationBits, signature: certificateSignature } = bls.createAggSig(
				publicKeys,
				pubKeySignaturePairs,
			));

			aggregateCommit = {
				aggregationBits,
				certificateSignature,
				height,
			};

			validators = weights.map((weight, i) => ({
				address: utils.getRandomBytes(20),
				bftWeight: BigInt(weight),
				blsKey: publicKeys[i],
			}));

			when(chain.dataAccess.getBlockHeaderByHeight).calledWith(height).mockReturnValue(blockHeader);

			bftMethod.getBFTHeights.mockReturnValue({
				maxHeightCertified,
				maxHeightPrecommitted,
			});

			when(bftMethod.getBFTParameters).calledWith(stateStore, height).mockReturnValue({
				certificateThreshold: threshold,
				validators,
			});

			when(bftMethod.getNextHeightBFTParameters)
				.calledWith(stateStore, maxHeightCertified + 1)
				.mockImplementation(() => {
					throw new BFTParameterNotFoundError();
				});
		});

		it('should return false when provided aggregate commit is INVALID', async () => {
			const invalidAggregateCommit = {
				...aggregateCommit,
				certificateSignature: utils.getRandomBytes(96),
			};

			const isCommitVerified = await commitPool.verifyAggregateCommit(
				stateStore,
				invalidAggregateCommit,
			);

			expect(isCommitVerified).toBeFalse();
		});

		it('should return true when provided aggregate commit is VALID', async () => {
			const isCommitVerified = await commitPool.verifyAggregateCommit(stateStore, aggregateCommit);

			expect(isCommitVerified).toBeTrue();
		});

		it('should return false when aggregate commit height is lower than minCertifyHeight', async () => {
			(commitPool['_minCertifyHeight'] as any) = height + 1;

			const isCommitVerified = await commitPool.verifyAggregateCommit(stateStore, aggregateCommit);

			expect(isCommitVerified).toBeFalse();
		});

		it('should return true when heightNextBFTParameters is low, but minCertifyHeight is set', async () => {
			(commitPool['_minCertifyHeight'] as any) = height;
			bftMethod.getBFTHeights.mockReturnValue({
				maxHeightCertified: 0,
				maxHeightPrecommitted,
			});

			when(bftMethod.getNextHeightBFTParameters)
				.calledWith(stateStore, 0 + 1)
				.mockResolvedValue(309 as never);

			const isCommitVerified = await commitPool.verifyAggregateCommit(stateStore, aggregateCommit);

			expect(isCommitVerified).toBeTrue();
		});

		it('should return true when aggregateCommit is empty, and height is equal to maxHeightCertified', async () => {
			const emptyAggregateCommit = {
				aggregationBits: EMPTY_BUFFER,
				certificateSignature: EMPTY_BUFFER,
				height: maxHeightCertified,
			};

			const isCommitVerified = await commitPool.verifyAggregateCommit(
				stateStore,
				emptyAggregateCommit,
			);

			expect(isCommitVerified).toBeTrue();
		});

		it('should return false when aggregate commit is not signed at height maxHeightCertified', async () => {
			bftMethod.getBFTHeights.mockReturnValue({
				maxHeightCertified: 1080,
				maxHeightPrecommitted: 1100,
			});

			const isCommitVerified = await commitPool.verifyAggregateCommit(stateStore, aggregateCommit);

			expect(isCommitVerified).toBeFalse();
		});

		it('should return false when certificateSignature empty', async () => {
			aggregateCommit = {
				aggregationBits,
				certificateSignature: Buffer.alloc(0),
				height,
			};

			const isCommitVerified = await commitPool.verifyAggregateCommit(stateStore, aggregateCommit);

			expect(isCommitVerified).toBeFalse();
		});

		it('should return false when aggregationBits empty', async () => {
			aggregateCommit = {
				aggregationBits: Buffer.alloc(0),
				certificateSignature,
				height,
			};

			const isCommitVerified = await commitPool.verifyAggregateCommit(stateStore, aggregateCommit);

			expect(isCommitVerified).toBeFalse();
		});

		it('should return false when aggregateCommit height is lesser than equal to maxHeightCertified', async () => {
			aggregateCommit = {
				aggregationBits,
				certificateSignature,
				height: maxHeightCertified - 10,
			};

			const isCommitVerified = await commitPool.verifyAggregateCommit(stateStore, aggregateCommit);

			expect(isCommitVerified).toBeFalse();
		});

		it('should return false when aggregateCommit height is more than maxHeightPrecommitted', async () => {
			aggregateCommit = {
				aggregationBits,
				certificateSignature,
				height: maxHeightPrecommitted + 10,
			};

			const isCommitVerified = await commitPool.verifyAggregateCommit(stateStore, aggregateCommit);

			expect(isCommitVerified).toBeFalse();
		});

		it('should return false when aggregateCommit height is above nextBFTParameter height minus 1', async () => {
			when(bftMethod.getNextHeightBFTParameters)
				.calledWith(stateStore, maxHeightCertified + 1)
				.mockReturnValue(aggregateCommit.height - 10);

			const isCommitVerified = await commitPool.verifyAggregateCommit(stateStore, aggregateCommit);

			expect(isCommitVerified).toBeFalse();
		});

		it('should return true when aggregateCommit height is equal nextBFTParameter height minus 1', async () => {
			when(bftMethod.getNextHeightBFTParameters)
				.calledWith(stateStore, maxHeightCertified + 1)
				.mockReturnValue(aggregateCommit.height + 1);

			const isCommitVerified = await commitPool.verifyAggregateCommit(stateStore, aggregateCommit);

			expect(isCommitVerified).toBeTrue();
		});

		it('should return true when aggregateCommit height is below nextBFTParameter height minus 1', async () => {
			when(bftMethod.getNextHeightBFTParameters)
				.calledWith(stateStore, maxHeightCertified + 1)
				.mockReturnValue(aggregateCommit.height + 10);

			const isCommitVerified = await commitPool.verifyAggregateCommit(stateStore, aggregateCommit);

			expect(isCommitVerified).toBeTrue();
		});
	});

	describe('getAggregateCommit', () => {
		it.todo('');
	});

	describe('_getMaxRemovalHeight', () => {
		let blockHeader: BlockHeader;
		const finalizedHeight = 1010;

		beforeEach(() => {
			chain.finalizedHeight = finalizedHeight;

			blockHeader = createFakeBlockHeader({
				height: finalizedHeight,
				timestamp: finalizedHeight * 10,
				aggregateCommit: {
					aggregationBits: Buffer.alloc(0),
					certificateSignature: Buffer.alloc(0),
					height: finalizedHeight,
				},
			});

			when(getBlockHeaderByHeight).mockImplementation(async () =>
				Promise.reject(new NotFoundError('')),
			);
			when(getBlockHeaderByHeight).calledWith(finalizedHeight).mockReturnValue(blockHeader);
		});
		it('should return successfully for an existing block header at finalizedHeight', async () => {
			const maxRemovalHeight = await commitPool['_getMaxRemovalHeight']();

			expect(maxRemovalHeight).toBe(blockHeader.aggregateCommit.height);
		});
		it('should throw an error for non-existent block header at finalizedHeight', async () => {
			chain.finalizedHeight = finalizedHeight + 1;

			await expect(commitPool['_getMaxRemovalHeight']()).rejects.toThrow(NotFoundError);
		});
	});

	describe('_aggregateSingleCommits', () => {
		it.todo('');
	});

	describe('aggregateSingleCommits', () => {
		const height = 45678;
		const blockHeader1 = createFakeBlockHeader({ height });
		const blockHeader2 = createFakeBlockHeader({ height });
		const blockHeader3 = createFakeBlockHeader({ height });
		const validatorInfo1 = {
			address: utils.getRandomBytes(20),
			blsPublicKey: utils.getRandomBytes(48),
			blsSecretKey: utils.getRandomBytes(32),
		};
		const validatorInfo2 = {
			address: utils.getRandomBytes(20),
			blsPublicKey: utils.getRandomBytes(48),
			blsSecretKey: utils.getRandomBytes(32),
		};
		const validatorInfo3 = {
			address: utils.getRandomBytes(20),
			blsPublicKey: utils.getRandomBytes(48),
			blsSecretKey: utils.getRandomBytes(32),
		};
		const unsignedCertificate1 = computeUnsignedCertificateFromBlockHeader(blockHeader1);
		const unsignedCertificate2 = computeUnsignedCertificateFromBlockHeader(blockHeader2);
		const unsignedCertificate3 = computeUnsignedCertificateFromBlockHeader(blockHeader3);
		const singleCommit1 = {
			blockID: blockHeader1.id,
			height: blockHeader1.height,
			validatorAddress: validatorInfo1.address,
			certificateSignature: signCertificate(
				validatorInfo1.blsSecretKey,
				chainID,
				unsignedCertificate1,
			),
		};
		const singleCommit2 = {
			blockID: blockHeader2.id,
			height: blockHeader2.height,
			validatorAddress: validatorInfo2.address,
			certificateSignature: signCertificate(
				validatorInfo2.blsSecretKey,
				chainID,
				unsignedCertificate2,
			),
		};
		const singleCommit3 = {
			blockID: blockHeader3.id,
			height: blockHeader3.height,
			validatorAddress: validatorInfo3.address,
			certificateSignature: signCertificate(
				validatorInfo3.blsSecretKey,
				chainID,
				unsignedCertificate3,
			),
		};
		const singleCommits = [singleCommit1, singleCommit2, singleCommit3];
		const validatorKeys = [
			validatorInfo1.blsPublicKey,
			validatorInfo2.blsPublicKey,
			validatorInfo3.blsPublicKey,
		];
		validatorKeys.sort((blsKeyA, blsKeyB) => blsKeyA.compare(blsKeyB));
		const pubKeySignaturePair1 = {
			publicKey: validatorInfo1.blsPublicKey,
			signature: singleCommit1.certificateSignature,
		};
		const pubKeySignaturePair2 = {
			publicKey: validatorInfo2.blsPublicKey,
			signature: singleCommit2.certificateSignature,
		};
		const pubKeySignaturePair3 = {
			publicKey: validatorInfo3.blsPublicKey,
			signature: singleCommit3.certificateSignature,
		};
		const pubKeySignaturePairs = [pubKeySignaturePair1, pubKeySignaturePair2, pubKeySignaturePair3];

		const { aggregationBits: aggregationBits1, signature: aggregateSignature1 } = bls.createAggSig(
			[validatorInfo1.blsPublicKey],
			[pubKeySignaturePair1],
		);

		const { aggregationBits, signature: aggregateSignature } = bls.createAggSig(
			validatorKeys,
			pubKeySignaturePairs,
		);

		let expectedCommit: AggregateCommit;
		let stateStore: StateStore;

		beforeEach(() => {
			commitPool = new CommitPool({
				bftMethod,
				blockTime,
				minCertifyHeight,
				network,
				chain,
				db: jest.fn() as any,
			});
			stateStore = new StateStore(new InMemoryDatabase());
		});

		it('should throw if there are no single commits', async () => {
			await expect(commitPool.aggregateSingleCommits(stateStore, [])).rejects.toThrow(
				'No single commit found',
			);
		});

		it('should return aggregated commit if there is atleast 1 single commit', async () => {
			expectedCommit = {
				height,
				aggregationBits: aggregationBits1,
				certificateSignature: aggregateSignature1,
			};
			bftMethod.getBFTParameters.mockReturnValue({
				validators: [{ address: validatorInfo1.address, blsKey: validatorInfo1.blsPublicKey }],
			});

			await expect(
				commitPool.aggregateSingleCommits(stateStore, [singleCommit1]),
			).resolves.toStrictEqual(expectedCommit);
		});

		it('should return aggregated commit for multiple single commits', async () => {
			expectedCommit = { height, aggregationBits, certificateSignature: aggregateSignature };
			bftMethod.getBFTParameters.mockReturnValue({
				validators: [
					{ address: validatorInfo1.address, blsKey: validatorInfo1.blsPublicKey },
					{ address: validatorInfo2.address, blsKey: validatorInfo2.blsPublicKey },
					{ address: validatorInfo3.address, blsKey: validatorInfo3.blsPublicKey },
				],
			});

			await expect(
				commitPool.aggregateSingleCommits(stateStore, singleCommits),
			).resolves.toStrictEqual(expectedCommit);
		});

		it('should throw if no bls public key is found for the validator', async () => {
			expectedCommit = { height, aggregationBits, certificateSignature: aggregateSignature };
			bftMethod.getBFTParameters.mockReturnValue({
				validators: [
					{ address: validatorInfo1.address, blsKey: validatorInfo1.blsPublicKey },
					{ address: validatorInfo2.address, blsKey: validatorInfo2.blsPublicKey },
				],
			});

			await expect(commitPool.aggregateSingleCommits(stateStore, singleCommits)).rejects.toThrow(
				`No bls public key entry found for validatorAddress ${validatorInfo3.address.toString(
					'hex',
				)}`,
			);
		});

		it('should call validator keys in lexicographical order', async () => {
			const spy = jest.spyOn(crypto.bls, 'createAggSig');
			bftMethod.getBFTParameters.mockReturnValue({
				validators: [
					{ address: validatorInfo1.address, blsKey: validatorInfo1.blsPublicKey },
					{ address: validatorInfo2.address, blsKey: validatorInfo2.blsPublicKey },
					{ address: validatorInfo3.address, blsKey: validatorInfo3.blsPublicKey },
				],
			});

			await commitPool.aggregateSingleCommits(stateStore, singleCommits);

			expect(spy).toHaveBeenCalledWith(validatorKeys, pubKeySignaturePairs);
		});
	});

	describe('_selectAggregateCommit', () => {
		const maxHeightPrecommitted = 1053;
		const maxHeightCertified = 1050;
		const heightNextBFTParameters = 1053;
		const threshold = 1;
		const blockHeader1 = createFakeBlockHeader({ height: 1051 });
		const blockHeader2 = createFakeBlockHeader({ height: 1052 });
		const validatorInfo1 = {
			address: utils.getRandomBytes(20),
			blsPublicKey: utils.getRandomBytes(48),
			blsSecretKey: utils.getRandomBytes(32),
		};
		const validatorInfo2 = {
			address: utils.getRandomBytes(20),
			blsPublicKey: utils.getRandomBytes(48),
			blsSecretKey: utils.getRandomBytes(32),
		};
		const unsignedCertificate1 = computeUnsignedCertificateFromBlockHeader(blockHeader1);
		const unsignedCertificate2 = computeUnsignedCertificateFromBlockHeader(blockHeader2);
		const singleCommit1 = {
			blockID: blockHeader1.id,
			height: blockHeader1.height,
			validatorAddress: validatorInfo1.address,
			certificateSignature: signCertificate(
				validatorInfo1.blsSecretKey,
				chainID,
				unsignedCertificate1,
			),
		};
		const singleCommit2 = {
			blockID: blockHeader2.id,
			height: blockHeader2.height,
			validatorAddress: validatorInfo2.address,
			certificateSignature: signCertificate(
				validatorInfo2.blsSecretKey,
				chainID,
				unsignedCertificate2,
			),
		};
		let stateStore: StateStore;

		beforeEach(() => {
			commitPool = new CommitPool({
				bftMethod,
				blockTime,
				minCertifyHeight,
				network,
				chain,
				db: jest.fn() as any,
			});
			commitPool['_nonGossipedCommits'].add(singleCommit1);
			commitPool['_gossipedCommits'].add(singleCommit2);
			commitPool['aggregateSingleCommits'] = jest.fn();
			stateStore = new StateStore(new InMemoryDatabase());

			bftMethod.getBFTHeights.mockResolvedValue({
				maxHeightCertified,
				maxHeightPrecommitted,
			});

			bftMethod.getNextHeightBFTParameters.mockResolvedValue(heightNextBFTParameters);

			bftMethod.getBFTParameters.mockResolvedValue({
				certificateThreshold: threshold,
				validators: [
					{ address: validatorInfo1.address, bftWeight: BigInt(1) },
					{ address: validatorInfo2.address, bftWeight: BigInt(1) },
				],
			});
		});

		it('should call bft method getBFTHeights', async () => {
			// Act
			await commitPool['_selectAggregateCommit'](stateStore);

			// Assert
			expect(commitPool['_bftMethod'].getBFTHeights).toHaveBeenCalledWith(stateStore);
		});

		it('should call bft method getNextHeightBFTParameters', async () => {
			// Act
			await commitPool['_selectAggregateCommit'](stateStore);

			// Assert
			expect(commitPool['_bftMethod'].getNextHeightBFTParameters).toHaveBeenCalledWith(
				stateStore,
				maxHeightCertified + 1,
			);
		});

		it('should call bft method getBFTParameters with min(heightNextBFTParameters - 1, maxHeightPrecommitted)', async () => {
			// Act
			await commitPool['_selectAggregateCommit'](stateStore);

			// Assert
			expect(commitPool['_bftMethod'].getBFTParameters).toHaveBeenCalledWith(
				stateStore,
				Math.min(heightNextBFTParameters - 1, maxHeightPrecommitted),
			);
		});

		it('should call getBFTParameters with maxHeightPrecommitted if getNextHeightBFTParameters does not return a valid height', async () => {
			// Arrange
			bftMethod.getNextHeightBFTParameters.mockRejectedValue(
				new BFTParameterNotFoundError('Error'),
			);

			// Act
			await commitPool['_selectAggregateCommit'](stateStore);

			// Assert
			expect(commitPool['_bftMethod'].getBFTParameters).toHaveBeenCalledWith(
				stateStore,
				maxHeightPrecommitted,
			);
		});

		it('should call aggregateSingleCommits when it reaches threshold', async () => {
			// Act
			await commitPool['_selectAggregateCommit'](stateStore);

			// Assert
			expect(commitPool['aggregateSingleCommits']).toHaveBeenCalledWith(stateStore, [
				singleCommit2,
			]);
		});

		it('should not call aggregateSingleCommits when it does not reach threshold and return default aggregateCommit', async () => {
			// Arrange
			bftMethod.getBFTParameters.mockReturnValue({
				certificateThreshold: 10,
				validators: [
					{ address: validatorInfo1.address, bftWeight: BigInt(1) },
					{ address: validatorInfo2.address, bftWeight: BigInt(1) },
				],
			});

			// Act
			const result = await commitPool['_selectAggregateCommit'](stateStore);

			// Assert
			expect(commitPool['aggregateSingleCommits']).not.toHaveBeenCalled();
			expect(result).toEqual({
				height: maxHeightCertified,
				aggregationBits: Buffer.alloc(0),
				certificateSignature: Buffer.alloc(0),
			});
		});

		it('should certify the singleCommit1 when nextBFTParameter is lower and minCertifyHeight is the same as singleCommit1', async () => {
			// Arrange
			bftMethod.getNextHeightBFTParameters.mockResolvedValue(309);
			(commitPool['_minCertifyHeight'] as any) = singleCommit1.height;

			// Act
			await commitPool['_selectAggregateCommit'](stateStore);

			// Assert
			expect(commitPool['aggregateSingleCommits']).toHaveBeenCalledWith(stateStore, [
				singleCommit1,
			]);
		});

		it('should certify the singleCommit2 even when heightNextBFTParameters is lower than minCerfifyHeight', async () => {
			// Arrange
			bftMethod.getNextHeightBFTParameters.mockResolvedValue(heightNextBFTParameters - 1);
			(commitPool['_minCertifyHeight'] as any) = heightNextBFTParameters - 1;

			// Act
			await commitPool['_selectAggregateCommit'](stateStore);

			// Assert
			expect(commitPool['aggregateSingleCommits']).toHaveBeenCalledWith(stateStore, [
				singleCommit2,
			]);
		});

		it('should certify the singleCommit2 even when heightNextBFTParameters is equal to minCerfifyHeight', async () => {
			// Arrange
			bftMethod.getNextHeightBFTParameters.mockResolvedValue(heightNextBFTParameters - 1);
			(commitPool['_minCertifyHeight'] as any) = heightNextBFTParameters - 1;

			// Act
			await commitPool['_selectAggregateCommit'](stateStore);

			// Assert
			expect(commitPool['aggregateSingleCommits']).toHaveBeenCalledWith(stateStore, [
				singleCommit2,
			]);
		});
	});
});
