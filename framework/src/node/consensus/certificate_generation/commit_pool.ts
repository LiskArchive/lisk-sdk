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

import { BlockHeader, Chain } from '@liskhq/lisk-chain';
import { dataStructures } from '@liskhq/lisk-utils';
import { createAggSig } from '@liskhq/lisk-cryptography';
import { KVStore } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { EMPTY_BUFFER, NETWORK_EVENT_COMMIT_MESSAGES, COMMIT_RANGE_STORED } from './constants';
import { BFTParameterNotFoundError } from '../../../modules/bft/errors';
import { APIContext } from '../../state_machine/types';
import { BFTAPI, PkSigPair, ValidatorAPI, AggregateCommit } from '../types';
import { Certificate, CommitPoolConfig, SingleCommit, ValidatorInfo } from './types';

import {
	computeCertificateFromBlockHeader,
	verifyAggregateCertificateSignature,
	getSortedWeightsAndValidatorKeys,
	signCertificate,
	verifySingleCertificateSignature,
} from './utils';
import { Network } from '../../network';
import { singleCommitSchema, singleCommitsNetworkPacketSchema } from './schema';
import { createNewAPIContext } from '../../state_machine/api_context';

export class CommitPool {
	private readonly _nonGossipedCommits: Map<number, SingleCommit[]> = new Map<
		number,
		SingleCommit[]
	>();
	private readonly _gossipedCommits: Map<number, SingleCommit[]> = new Map<
		number,
		SingleCommit[]
	>();
	private readonly _blockTime: number;
	private readonly _bftAPI: BFTAPI;
	private readonly _validatorsAPI: ValidatorAPI;
	private readonly _chain: Chain;
	private readonly _network: Network;
	private readonly _db: KVStore;
	private readonly _generatorAddress: Buffer;
	private _jobIntervalID!: NodeJS.Timeout;

	public constructor(config: CommitPoolConfig) {
		this._blockTime = config.blockTime;
		this._bftAPI = config.bftAPI;
		this._validatorsAPI = config.validatorsAPI;
		this._chain = config.chain;
		this._network = config.network;
		this._db = config.db;
		this._generatorAddress = config.generatorAddress;
	}

	public start() {
		// Run job every BLOCK_TIME/2 interval
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._jobIntervalID = setInterval(async () => {
			const apiContext = createNewAPIContext(this._db);
			await this._job(apiContext);
		}, (this._blockTime / 2) * 1000);
	}

	public stop() {
		clearInterval(this._jobIntervalID);
	}

	public addCommit(commit: SingleCommit, height: number): void {
		const currentCommits = this._nonGossipedCommits.get(height) ?? [];
		const doesCommitExist = currentCommits.some(aCommit =>
			aCommit.certificateSignature.equals(commit.certificateSignature),
		);
		if (!doesCommitExist) {
			this._nonGossipedCommits.set(height, [...currentCommits, commit]);
		}
	}

	public async validateCommit(apiContext: APIContext, commit: SingleCommit): Promise<boolean> {
		// Validation step 4
		const blockHeaderAtCommitHeight = await this._chain.dataAccess.getBlockHeaderByHeight(
			commit.height,
		);
		if (!blockHeaderAtCommitHeight.id.equals(commit.blockID)) {
			return false;
		}

		// Validation step 1
		const existsInNonGossiped = !!this._nonGossipedCommits
			.get(commit.height)
			?.some(
				nonGossipedCommit =>
					nonGossipedCommit.blockID.equals(commit.blockID) &&
					nonGossipedCommit.validatorAddress.equals(commit.validatorAddress),
			);

		const existsInGossiped = !!this._gossipedCommits
			.get(commit.height)
			?.some(
				gossipedCommit =>
					gossipedCommit.blockID.equals(commit.blockID) &&
					gossipedCommit.validatorAddress.equals(commit.validatorAddress),
			);

		const doesCommitExist = existsInGossiped || existsInNonGossiped;

		if (doesCommitExist) {
			return false;
		}

		// Validation Step 2
		const maxRemovalHeight = await this._getMaxRemovalHeight();
		if (commit.height <= maxRemovalHeight) {
			return false;
		}

		// Validation Step 3
		const { maxHeightPrecommitted } = await this._bftAPI.getBFTHeights(apiContext);
		const isCommitInRange =
			commit.height >= maxHeightPrecommitted - COMMIT_RANGE_STORED &&
			commit.height <= maxHeightPrecommitted;
		const doesBFTParamExistForNextHeight = await this._bftAPI.existBFTParameters(
			apiContext,
			commit.height + 1,
		);
		if (!isCommitInRange && !doesBFTParamExistForNextHeight) {
			return false;
		}

		// Validation Step 5
		const { validators } = await this._bftAPI.getBFTParameters(apiContext, commit.height);
		const isCommitValidatorActive = validators.find(validator =>
			validator.address.equals(commit.validatorAddress),
		);
		if (!isCommitValidatorActive) {
			throw new Error('Commit validator was not active for its height.');
		}

		// Validation Step 6
		const certificate = computeCertificateFromBlockHeader(blockHeaderAtCommitHeight);
		const { blsKey } = await this._validatorsAPI.getValidatorAccount(
			apiContext,
			commit.validatorAddress,
		);
		const { networkIdentifier } = this._chain;
		const isSingleCertificateVerified = verifySingleCertificateSignature(
			blsKey,
			commit.certificateSignature,
			networkIdentifier,
			certificate,
		);

		if (!isSingleCertificateVerified) {
			throw new Error('Certificate signature is not valid.');
		}

		return true;
	}

	public getCommitsByHeight(height: number): SingleCommit[] {
		const nonGossipedCommits = this._nonGossipedCommits.get(height) ?? [];
		const gossipedCommits = this._gossipedCommits.get(height) ?? [];
		return [...nonGossipedCommits, ...gossipedCommits];
	}

	public createSingleCommit(
		blockHeader: BlockHeader,
		validatorInfo: ValidatorInfo,
		networkIdentifier: Buffer,
	): SingleCommit {
		const commit = {
			blockID: blockHeader.id,
			height: blockHeader.height,
			validatorAddress: validatorInfo.address,
			certificateSignature: signCertificate(
				validatorInfo.blsSecretKey,
				networkIdentifier,
				computeCertificateFromBlockHeader(blockHeader),
			),
		};

		return commit;
	}

	public async verifyAggregateCommit(
		apiContext: APIContext,
		aggregateCommit: AggregateCommit,
	): Promise<boolean> {
		const { maxHeightCertified, maxHeightPrecommitted } = await this._bftAPI.getBFTHeights(
			apiContext,
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
			const heightNextBFTParameters = await this._bftAPI.getNextHeightBFTParameters(
				apiContext,
				maxHeightCertified + 1,
			);

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
			...computeCertificateFromBlockHeader(blockHeader),
			aggregationBits: aggregateCommit.aggregationBits,
			signature: aggregateCommit.certificateSignature,
		};
		const { networkIdentifier } = this._chain;
		const bftParams = await this._bftAPI.getBFTParameters(apiContext, aggregateCommit.height);
		const threshold = bftParams.certificateThreshold;

		const validatorKeysWithWeights = [];
		for (const validator of bftParams.validators) {
			const validatorAccount = await this._validatorsAPI.getValidatorAccount(
				apiContext,
				validator.address,
			);
			validatorKeysWithWeights.push({
				weight: validator.bftWeight,
				blsKey: validatorAccount.blsKey,
			});
		}
		const { weights, validatorKeys } = getSortedWeightsAndValidatorKeys(validatorKeysWithWeights);

		return verifyAggregateCertificateSignature(
			validatorKeys,
			weights,
			threshold,
			networkIdentifier,
			certificate,
		);
	}

	public async getAggregageCommit(apiContext: APIContext): Promise<AggregateCommit> {
		return this._selectAggregateCommit(apiContext);
	}

	public async aggregateSingleCommits(
		apiContext: APIContext,
		singleCommits: SingleCommit[],
	): Promise<AggregateCommit> {
		if (singleCommits.length === 0) {
			throw new Error('No single commit found');
		}

		const { height } = singleCommits[0];

		// assuming this list of validators includes all validators corresponding to each singleCommit.validatorAddress
		const { validators } = await this._bftAPI.getBFTParameters(apiContext, height);
		const addressToBlsKey: dataStructures.BufferMap<Buffer> = new dataStructures.BufferMap();
		const validatorKeys: Buffer[] = [];

		for (const validator of validators) {
			const validatorAccount = await this._validatorsAPI.getValidatorAccount(
				apiContext,
				validator.address,
			);
			addressToBlsKey.set(validator.address, validatorAccount.blsKey);
			validatorKeys.push(validatorAccount.blsKey);
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

		const { aggregationBits, signature: aggregateSignature } = createAggSig(
			validatorKeys,
			pubKeySignaturePairs,
		);

		const aggregateCommit = {
			height,
			aggregationBits,
			certificateSignature: aggregateSignature,
		};

		return aggregateCommit;
	}

	private async _selectAggregateCommit(apiContext: APIContext): Promise<AggregateCommit> {
		const { maxHeightCertified, maxHeightPrecommitted } = await this._bftAPI.getBFTHeights(
			apiContext,
		);
		let heightNextBFTParameters: number;
		let nextHeight: number;

		try {
			heightNextBFTParameters = await this._bftAPI.getNextHeightBFTParameters(
				apiContext,
				maxHeightCertified + 1,
			);
			nextHeight = Math.min(heightNextBFTParameters - 1, maxHeightPrecommitted);
		} catch (err) {
			if (!(err instanceof BFTParameterNotFoundError)) {
				throw err;
			}
			nextHeight = maxHeightPrecommitted;
		}

		while (nextHeight > maxHeightCertified) {
			const singleCommits = [
				...(this._nonGossipedCommits.get(nextHeight) ?? []),
				...(this._gossipedCommits.get(nextHeight) ?? []),
			];
			const nextValidators = singleCommits.map(commit => commit.validatorAddress);
			let aggregateBFTWeight = BigInt(0);

			// Assume BFT parameters exist for next height
			const {
				validators: bftParamValidators,
				certificateThreshold,
			} = await this._bftAPI.getBFTParameters(apiContext, nextHeight);

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
				return this.aggregateSingleCommits(apiContext, singleCommits);
			}

			nextHeight -= 1;
		}

		return {
			height: maxHeightCertified,
			aggregationBits: EMPTY_BUFFER,
			certificateSignature: EMPTY_BUFFER,
		};
	}

	private async _job(apiContext: APIContext): Promise<void> {
		const removalHeight = await this._getMaxRemovalHeight();
		const { maxHeightPrecommitted } = await this._bftAPI.getBFTHeights(apiContext);

		// Clean up nonGossipedCommits
		const deletedNonGossipedHeights = await this._getDeleteHeights(
			apiContext,
			this._nonGossipedCommits,
			removalHeight,
			maxHeightPrecommitted,
		);
		for (const height of deletedNonGossipedHeights) {
			this._nonGossipedCommits.delete(height);
		}
		// Clean up gossipedCommits
		const deletedGossipedHeights = await this._getDeleteHeights(
			apiContext,
			this._gossipedCommits,
			removalHeight,
			maxHeightPrecommitted,
		);
		for (const height of deletedGossipedHeights) {
			this._gossipedCommits.delete(height);
		}
		// 2. Select commits to gossip
		const validators = await this._bftAPI.getCurrentValidators(apiContext);
		const numActiveValidators = validators.length;
		// Get a list of commits sorted by ascending order of height
		const allCommits = this._getAllCommits();

		const selectedCommits = [];
		for (const commit of allCommits) {
			if (selectedCommits.length >= numActiveValidators) {
				break;
			}

			// 2.1 Choosing the commit with smaller height first
			if (commit.height < maxHeightPrecommitted - COMMIT_RANGE_STORED) {
				selectedCommits.push(commit);
			}
		}
		// Non gossiped commits with descending order of height
		const sortedNonGossipedCommits = [...this._nonGossipedCommits.values()]
			.flat()
			.sort((a, b) => b.height - a.height);

		// 2.2 Select newly created commits by generator
		for (const [index, commit] of sortedNonGossipedCommits.entries()) {
			if (selectedCommits.length >= numActiveValidators) {
				break;
			}
			if (commit.validatorAddress.equals(this._generatorAddress)) {
				selectedCommits.push(commit);
				const nonGossipedList = this._nonGossipedCommits.get(commit.height);
				const indexInList = nonGossipedList?.findIndex(c =>
					c.certificateSignature.equals(commit.certificateSignature),
				);
				nonGossipedList?.splice(indexInList as number, 1);
				if (nonGossipedList?.length === 0) {
					this._nonGossipedCommits.delete(commit.height);
				} else {
					this._nonGossipedCommits.set(commit.height, nonGossipedList as SingleCommit[]);
				}
				// Remove the commit from the sorted array
				sortedNonGossipedCommits.splice(index, 1);
			}
		}
		// 2.3 Select newly received commits by others
		for (const commit of sortedNonGossipedCommits) {
			if (selectedCommits.length >= numActiveValidators) {
				break;
			}
			selectedCommits.push(commit);
			// 4. Move any gossiped commit message included in nonGossipedCommits to gossipedCommits.
			const commitsAtHeight = this._gossipedCommits.get(commit.height) ?? [];
			commitsAtHeight.push(commit);

			this._gossipedCommits.set(commit.height, commitsAtHeight);
			const nonGossipedList = this._nonGossipedCommits.get(commit.height);
			const index = nonGossipedList?.findIndex(c =>
				c.certificateSignature.equals(commit.certificateSignature),
			);
			nonGossipedList?.splice(index as number, 1);
			if (nonGossipedList?.length === 0) {
				this._nonGossipedCommits.delete(commit.height);
			} else {
				this._nonGossipedCommits.set(commit.height, nonGossipedList as SingleCommit[]);
			}
		}

		const encodedCommitArray = selectedCommits.map(commit =>
			codec.encode(singleCommitSchema, commit),
		);
		// 3. Gossip an array of up to 2*numActiveValidators commit messages to 16 randomly chosen connected peers with at least 8 of them being outgoing peers (same parameters as block propagation)
		this._network.send({
			event: NETWORK_EVENT_COMMIT_MESSAGES,
			data: codec.encode(singleCommitsNetworkPacketSchema, { commits: encodedCommitArray }),
		});
	}

	private async _getDeleteHeights(
		apiContext: APIContext,
		commitMap: Map<number, SingleCommit[]>,
		removalHeight: number,
		maxHeightPrecommitted: number,
	): Promise<number[]> {
		const deleteHeights = [];
		for (const height of commitMap.keys()) {
			// 1. Remove any single commit message m from nonGossipedCommits
			if (height <= removalHeight) {
				deleteHeights.push(height);
				continue;
			}
			// 2. For every commit message m in nonGossipedCommits or gossipedCommits one of the following two conditions has to hold, otherwise it is discarded
			const nonGossipedCommits = commitMap.get(height) as SingleCommit[];
			for (const singleCommit of nonGossipedCommits) {
				// Condition #1
				if (
					!(
						maxHeightPrecommitted - COMMIT_RANGE_STORED <= singleCommit.height ||
						singleCommit.height <= maxHeightPrecommitted
					)
				) {
					continue;
				}
				// Condition #2
				const changeOfBFTParams = await this._bftAPI.existBFTParameters(
					apiContext,
					singleCommit.height + 1,
				);
				if (!changeOfBFTParams) {
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
		return [...this._nonGossipedCommits.values(), ...this._gossipedCommits.values()]
			.flat()
			.sort((a, b) => a.height - b.height);
	}
}
