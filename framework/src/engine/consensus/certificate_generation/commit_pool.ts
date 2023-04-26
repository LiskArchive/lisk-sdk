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

import { BlockHeader, Chain, StateStore } from '@liskhq/lisk-chain';
import { dataStructures } from '@liskhq/lisk-utils';
import { bls } from '@liskhq/lisk-cryptography';
import { Database } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { EMPTY_BUFFER, NETWORK_EVENT_COMMIT_MESSAGES, COMMIT_RANGE_STORED } from './constants';
import { BFTParameterNotFoundError } from '../../bft/errors';
import { PkSigPair, AggregateCommit } from '../types';
import { Certificate, CommitPoolConfig, SingleCommit, ValidatorInfo } from './types';

import {
	computeUnsignedCertificateFromBlockHeader,
	verifyAggregateCertificateSignature,
	signCertificate,
	verifySingleCertificateSignature,
} from './utils';
import { Network } from '../../network';
import { singleCommitSchema, singleCommitsNetworkPacketSchema } from './schema';
import { CommitList, COMMIT_SORT } from './commit_list';
import { BFTMethod } from '../../bft';
import { defaultMetrics } from '../../metrics/metrics';

export class CommitPool {
	private readonly _nonGossipedCommits: CommitList;
	private readonly _nonGossipedCommitsLocal: CommitList;
	private readonly _gossipedCommits: CommitList;
	private readonly _blockTime: number;
	private readonly _bftMethod: BFTMethod;
	private readonly _minCertifyHeight: number;
	private readonly _chain: Chain;
	private readonly _network: Network;
	private readonly _db: Database;
	private _jobIntervalID!: NodeJS.Timeout;

	private readonly _metrics = {
		singleCommits: defaultMetrics.gauge('commitPool_numSingleCommits'),
		nonGossippedCommits: defaultMetrics.gauge('commitPool_numNonGossippedCommits'),
		nonGossippedCommitsLocal: defaultMetrics.gauge('commitPool_numNonGossippedCommitsLocal'),
		gossippedCommits: defaultMetrics.gauge('commitPool_numGossippedCommits'),
		job: defaultMetrics.histogram('commitPool_job', [0.01, 0.05, 0.1, 0.2, 0.5, 1, 5]),
	};

	public constructor(config: CommitPoolConfig) {
		this._blockTime = config.blockTime;
		this._bftMethod = config.bftMethod;
		this._minCertifyHeight = config.minCertifyHeight;
		this._chain = config.chain;
		this._network = config.network;
		this._db = config.db;
		this._nonGossipedCommits = new CommitList();
		this._nonGossipedCommitsLocal = new CommitList();
		this._gossipedCommits = new CommitList();
	}

	public start() {
		// Run job every BLOCK_TIME/2 interval
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._jobIntervalID = setInterval(async () => {
			const stateStore = new StateStore(this._db);
			const endTimer = this._metrics.job.startTimer();
			await this._job(stateStore);
			endTimer();
		}, (this._blockTime / 2) * 1000);
	}

	public stop() {
		clearInterval(this._jobIntervalID);
	}

	public addCommit(commit: SingleCommit, local = false): void {
		if (!this._nonGossipedCommits.exists(commit) && !this._nonGossipedCommitsLocal.exists(commit)) {
			if (local) {
				this._nonGossipedCommitsLocal.add(commit);
			} else {
				this._nonGossipedCommits.add(commit);
			}
			this._metrics.singleCommits.inc();
		}
	}

	public async validateCommit(methodContext: StateStore, commit: SingleCommit): Promise<boolean> {
		// Validation step 1
		const existsInNonGossiped = this._nonGossipedCommits.exists(commit);
		const existsInNonGossipedLocal = this._nonGossipedCommitsLocal.exists(commit);
		const existsInGossiped = this._gossipedCommits.exists(commit);
		const doesCommitExist = existsInGossiped || existsInNonGossiped || existsInNonGossipedLocal;

		if (doesCommitExist) {
			return false;
		}

		// Validation Step 2
		const maxRemovalHeight = await this._getMaxRemovalHeight();
		if (commit.height <= maxRemovalHeight) {
			return false;
		}

		// Validation Step 3
		const currentHeight = this._chain.lastBlock.header.height;
		const { maxHeightPrecommitted } = await this._bftMethod.getBFTHeights(methodContext);
		const isCommitInRange =
			commit.height >= maxHeightPrecommitted - COMMIT_RANGE_STORED &&
			commit.height <= currentHeight;
		const doesBFTParamExistForNextHeight = await this._bftMethod.existBFTParameters(
			methodContext,
			commit.height + 1,
		);
		if (!isCommitInRange && !doesBFTParamExistForNextHeight) {
			return false;
		}

		// Validation step 4
		const blockHeaderAtCommitHeight = await this._chain.dataAccess.getBlockHeaderByHeight(
			commit.height,
		);
		if (!blockHeaderAtCommitHeight.id.equals(commit.blockID)) {
			return false;
		}

		// Validation Step 5
		const { validators } = await this._bftMethod.getBFTParameters(methodContext, commit.height);
		const validator = validators.find(v => v.address.equals(commit.validatorAddress));
		if (!validator) {
			throw new Error('Commit validator was not active for its height.');
		}

		// Validation Step 6
		const unsignedCertificate =
			computeUnsignedCertificateFromBlockHeader(blockHeaderAtCommitHeight);
		const { chainID } = this._chain;
		const isSingleCertificateVerified = verifySingleCertificateSignature(
			validator.blsKey,
			commit.certificateSignature,
			chainID,
			unsignedCertificate,
		);

		if (!isSingleCertificateVerified) {
			throw new Error('Certificate signature is not valid.');
		}

		return true;
	}

	public getCommitsByHeight(height: number): SingleCommit[] {
		const nonGossipedCommits = this._nonGossipedCommits.getByHeight(height);
		const nonGossipedCommitsLocal = this._nonGossipedCommitsLocal.getByHeight(height);
		const gossipedCommits = this._gossipedCommits.getByHeight(height);
		return [...nonGossipedCommits, ...nonGossipedCommitsLocal, ...gossipedCommits];
	}

	public createSingleCommit(
		blockHeader: BlockHeader,
		validatorInfo: ValidatorInfo,
		chainID: Buffer,
	): SingleCommit {
		return {
			blockID: blockHeader.id,
			height: blockHeader.height,
			validatorAddress: validatorInfo.address,
			certificateSignature: signCertificate(
				validatorInfo.blsSecretKey,
				chainID,
				computeUnsignedCertificateFromBlockHeader(blockHeader),
			),
		};
	}

	public async verifyAggregateCommit(
		stateStore: StateStore,
		aggregateCommit: AggregateCommit,
	): Promise<boolean> {
		const { maxHeightCertified, maxHeightPrecommitted } = await this._bftMethod.getBFTHeights(
			stateStore,
		);

		if (
			aggregateCommit.aggregationBits.length === 0 &&
			aggregateCommit.certificateSignature.length === 0 &&
			aggregateCommit.height === maxHeightCertified
		) {
			return true;
		}

		if (
			aggregateCommit.aggregationBits.length === 0 ||
			aggregateCommit.certificateSignature.length === 0
		) {
			return false;
		}

		if (aggregateCommit.height <= maxHeightCertified) {
			return false;
		}

		if (aggregateCommit.height > maxHeightPrecommitted) {
			return false;
		}

		try {
			let heightNextBFTParameters = await this._bftMethod.getNextHeightBFTParameters(
				stateStore,
				maxHeightCertified + 1,
			);

			heightNextBFTParameters = Math.max(heightNextBFTParameters, this._minCertifyHeight);

			if (aggregateCommit.height > heightNextBFTParameters - 1) {
				return false;
			}
		} catch (err) {
			if (!(err instanceof BFTParameterNotFoundError)) {
				throw err;
			}
		}

		const blockHeader = await this._chain.dataAccess.getBlockHeaderByHeight(aggregateCommit.height);
		const certificate: Certificate = {
			...computeUnsignedCertificateFromBlockHeader(blockHeader),
			aggregationBits: aggregateCommit.aggregationBits,
			signature: aggregateCommit.certificateSignature,
		};
		const { validators, certificateThreshold } = await this._bftMethod.getBFTParameters(
			stateStore,
			aggregateCommit.height,
		);

		return verifyAggregateCertificateSignature(
			validators,
			certificateThreshold,
			this._chain.chainID,
			certificate,
		);
	}

	public async getAggregateCommit(methodContext: StateStore): Promise<AggregateCommit> {
		return this._selectAggregateCommit(methodContext);
	}

	public async aggregateSingleCommits(
		methodContext: StateStore,
		singleCommits: SingleCommit[],
	): Promise<AggregateCommit> {
		if (singleCommits.length === 0) {
			throw new Error('No single commit found');
		}

		const { height } = singleCommits[0];

		// assuming this list of validators includes all validators corresponding to each singleCommit.validatorAddress
		const { validators } = await this._bftMethod.getBFTParameters(methodContext, height);
		const addressToBlsKey: dataStructures.BufferMap<Buffer> = new dataStructures.BufferMap();
		const validatorKeys: Buffer[] = [];

		for (const validator of validators) {
			addressToBlsKey.set(validator.address, validator.blsKey);
			validatorKeys.push(validator.blsKey);
		}

		const pubKeySignaturePairs: PkSigPair[] = [];

		for (const commit of singleCommits) {
			const publicKey = addressToBlsKey.get(commit.validatorAddress);
			if (!publicKey) {
				throw new Error(
					`No bls public key entry found for validatorAddress ${commit.validatorAddress.toString(
						'hex',
					)}`,
				);
			}
			pubKeySignaturePairs.push({ publicKey, signature: commit.certificateSignature });
		}

		validatorKeys.sort((blsKeyA, blsKeyB) => blsKeyA.compare(blsKeyB));

		const { aggregationBits, signature: aggregateSignature } = bls.createAggSig(
			validatorKeys,
			pubKeySignaturePairs,
		);

		return {
			height,
			aggregationBits,
			certificateSignature: aggregateSignature,
		};
	}

	private async _selectAggregateCommit(methodContext: StateStore): Promise<AggregateCommit> {
		const { maxHeightCertified, maxHeightPrecommitted } = await this._bftMethod.getBFTHeights(
			methodContext,
		);
		let heightNextBFTParameters: number;
		let nextHeight: number;

		try {
			heightNextBFTParameters = await this._bftMethod.getNextHeightBFTParameters(
				methodContext,
				maxHeightCertified + 1,
			);
			nextHeight = Math.min(heightNextBFTParameters - 1, maxHeightPrecommitted);
			nextHeight = Math.max(nextHeight, this._minCertifyHeight - 1);
		} catch (err) {
			if (!(err instanceof BFTParameterNotFoundError)) {
				throw err;
			}
			nextHeight = maxHeightPrecommitted;
		}

		while (nextHeight > maxHeightCertified) {
			const singleCommits = [
				...this._nonGossipedCommits.getByHeight(nextHeight),
				...this._nonGossipedCommitsLocal.getByHeight(nextHeight),
				...this._gossipedCommits.getByHeight(nextHeight),
			];
			const nextValidators = singleCommits.map(commit => commit.validatorAddress);
			let aggregateBFTWeight = BigInt(0);

			// Assume BFT parameters exist for next height
			const { validators: bftParamValidators, certificateThreshold } =
				await this._bftMethod.getBFTParameters(methodContext, nextHeight);

			for (const matchingAddress of nextValidators) {
				const bftParamsValidatorInfo = bftParamValidators.find(bftParamValidator =>
					bftParamValidator.address.equals(matchingAddress),
				);
				if (!bftParamsValidatorInfo) {
					throw new Error('Validator address not found in commit pool');
				}

				aggregateBFTWeight += bftParamsValidatorInfo.bftWeight;
			}

			if (aggregateBFTWeight >= certificateThreshold) {
				return this.aggregateSingleCommits(methodContext, singleCommits);
			}

			nextHeight -= 1;
		}

		return {
			height: maxHeightCertified,
			aggregationBits: EMPTY_BUFFER,
			certificateSignature: EMPTY_BUFFER,
		};
	}

	private async _job(methodContext: StateStore): Promise<void> {
		const removalHeight = await this._getMaxRemovalHeight();
		const currentHeight = this._chain.lastBlock.header.height;
		const { maxHeightPrecommitted } = await this._bftMethod.getBFTHeights(methodContext);

		// Clean up nonGossipedCommits
		const deletedNonGossipedHeights = await this._getDeleteHeights(
			methodContext,
			this._nonGossipedCommits,
			removalHeight,
			maxHeightPrecommitted,
			currentHeight,
		);
		for (const height of deletedNonGossipedHeights) {
			this._nonGossipedCommits.deleteByHeight(height);
		}
		this._metrics.nonGossippedCommits.set(this._nonGossipedCommits.size());

		// Clean up nonGossipedCommitsLocal
		const deletedNonGossipedHeightsLocal = await this._getDeleteHeights(
			methodContext,
			this._nonGossipedCommitsLocal,
			removalHeight,
			maxHeightPrecommitted,
			currentHeight,
		);
		for (const height of deletedNonGossipedHeightsLocal) {
			this._nonGossipedCommitsLocal.deleteByHeight(height);
		}
		this._metrics.nonGossippedCommitsLocal.set(this._nonGossipedCommitsLocal.size());

		// Clean up gossipedCommits
		const deletedGossipedHeights = await this._getDeleteHeights(
			methodContext,
			this._gossipedCommits,
			removalHeight,
			maxHeightPrecommitted,
			currentHeight,
		);
		for (const height of deletedGossipedHeights) {
			this._gossipedCommits.deleteByHeight(height);
		}
		this._metrics.gossippedCommits.set(this._gossipedCommits.size());

		// 2. Select commits to gossip
		const nextHeight = this._chain.lastBlock.header.height + 1;
		const { validators } = await this._bftMethod.getBFTParameters(methodContext, nextHeight);

		const maxSelectedCommitsLength = 2 * validators.length;
		// Get a list of commits sorted by ascending order of height
		const allCommits = this._getAllCommits();
		this._metrics.singleCommits.set(allCommits.length);

		const selectedCommits = [];
		for (const commit of allCommits) {
			if (selectedCommits.length >= maxSelectedCommitsLength) {
				break;
			}

			// 2.1 Choosing the commit with smaller height first
			if (commit.height < maxHeightPrecommitted - COMMIT_RANGE_STORED) {
				selectedCommits.push(commit);
			}
		}

		// 2.2 Select newly created commits by generator
		// Non gossiped commits with descending order of height by generator
		const sortedNonGossipedCommitsLocal = this._nonGossipedCommitsLocal.getAll(COMMIT_SORT.DSC);
		for (const commit of sortedNonGossipedCommitsLocal) {
			if (selectedCommits.length >= maxSelectedCommitsLength) {
				break;
			}
			selectedCommits.push(commit);
		}

		// 2.3 Select newly received commits by others
		// Non gossiped commits with descending order of height
		const sortedNonGossipedCommits = this._nonGossipedCommits.getAll(COMMIT_SORT.DSC);
		for (const commit of sortedNonGossipedCommits) {
			if (selectedCommits.length >= maxSelectedCommitsLength) {
				break;
			}
			selectedCommits.push(commit);
		}

		const encodedCommitArray = selectedCommits.map(commit =>
			codec.encode(singleCommitSchema, commit),
		);

		// 3. Gossip an array of up to 2*numActiveValidators commit messages to 16 randomly chosen connected peers with at least 8 of them being outgoing peers (same parameters as block propagation)
		this._network.send({
			event: NETWORK_EVENT_COMMIT_MESSAGES,
			data: codec.encode(singleCommitsNetworkPacketSchema, { commits: encodedCommitArray }),
		});

		// 4. Move any gossiped commit message included in nonGossipedCommits, nonGossipedCommitsLocal to gossipedCommits.
		for (const commit of selectedCommits) {
			if (!this._gossipedCommits.exists(commit)) {
				this._gossipedCommits.add(commit);
			}
			this._nonGossipedCommits.deleteSingle(commit);
			this._nonGossipedCommitsLocal.deleteSingle(commit);
		}
	}

	private async _getDeleteHeights(
		methodContext: StateStore,
		commitMap: CommitList,
		removalHeight: number,
		maxHeightPrecommitted: number,
		currentHeight: number,
	): Promise<number[]> {
		const deleteHeights = [];
		for (const height of commitMap.getHeights()) {
			// 1. Remove any single commit message m from nonGossipedCommits
			if (height <= removalHeight) {
				deleteHeights.push(height);
				continue;
			}
			// 2. For every commit message m in nonGossipedCommits or gossipedCommits one of the following two conditions has to hold, otherwise it is discarded
			const nonGossipedCommits = commitMap.getByHeight(height);
			for (const singleCommit of nonGossipedCommits) {
				// Condition #1
				if (
					maxHeightPrecommitted - COMMIT_RANGE_STORED <= singleCommit.height &&
					singleCommit.height <= currentHeight
				) {
					continue;
				}
				// Condition #2
				const changeOfBFTParams = await this._bftMethod.existBFTParameters(
					methodContext,
					singleCommit.height + 1,
				);
				if (changeOfBFTParams) {
					continue;
				}

				deleteHeights.push(height);
			}
		}

		return deleteHeights;
	}

	private async _getMaxRemovalHeight() {
		const blockHeader = await this._chain.dataAccess.getBlockHeaderByHeight(
			this._chain.finalizedHeight,
		);
		return blockHeader.aggregateCommit.height;
	}

	private _getAllCommits(): SingleCommit[] {
		// Flattened list of all the single commits from both gossiped and non gossiped list sorted by ascending order of height
		return [
			...this._nonGossipedCommits.getAll(),
			...this._nonGossipedCommitsLocal.getAll(),
			...this._gossipedCommits.getAll(),
		].sort((a, b) => a.height - b.height);
	}
}
