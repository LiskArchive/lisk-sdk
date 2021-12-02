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
import { EMPTY_BUFFER } from './constants';
import { BFTParameterNotFoundError } from '../../../modules/bft/errors';
import { APIContext } from '../../state_machine/types';
import { BFTAPI, ValidatorAPI } from '../types';
import { COMMIT_RANGE_STORED } from './constants';
import {
	AggregateCommit,
	Certificate,
	CommitPoolConfig,
	SingleCommit,
	ValidatorInfo,
} from './types';
import {
	computeCertificateFromBlockHeader,
	verifyAggregateCertificateSignature,
	getSortedWeightsAndValidatorKeys,
	signCertificate,
	verifySingleCertificateSignature,
} from './utils';

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

	public constructor(config: CommitPoolConfig) {
		this._blockTime = config.blockTime;
		this._bftAPI = config.bftAPI;
		this._validatorsAPI = config.validatorsAPI;
		this._chain = config.chain;
		// eslint-disable-next-line no-console
		console.log(
			this._nonGossipedCommits.size,
			this._gossipedCommits.size,
			this._blockTime,
			this._bftAPI,
			this._validatorsAPI,
		);
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async job(): Promise<void> {}

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
		const doesCommitExistsInNonGossipedCommits = !!this._nonGossipedCommits
			.get(commit.height)
			?.some(
				nonGossipedCommit =>
					nonGossipedCommit.blockID === commit.blockID &&
					nonGossipedCommit.validatorAddress === commit.validatorAddress,
			);

		const doesCommitExistsInGossipedCommits = !!this._gossipedCommits
			.get(commit.height)
			?.some(
				gossipedCommit =>
					gossipedCommit.blockID === commit.blockID &&
					gossipedCommit.validatorAddress === commit.validatorAddress,
			);

		const doesCommitExist =
			doesCommitExistsInGossipedCommits || doesCommitExistsInNonGossipedCommits;

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
			commit.height < maxHeightPrecommitted;
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
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private _aggregateSingleCommits(_singleCommits: SingleCommit[]): AggregateCommit {
		return {} as AggregateCommit;
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
				return this._aggregateSingleCommits(singleCommits);
			}

			nextHeight -= 1;
		}

		return {
			height: maxHeightCertified,
			aggregationBits: EMPTY_BUFFER,
			certificateSignature: EMPTY_BUFFER,
		};
	}

	private async _getMaxRemovalHeight() {
		const blockHeader = await this._chain.dataAccess.getBlockHeaderByHeight(
			this._chain.finalizedHeight,
		);
		return blockHeader.aggregateCommit.height;
	}
}
