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

import { BlockHeader, StateStore } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import {
	areDistinctHeadersContradicting,
	getGeneratorKeys,
	sortValidatorsByAddress,
	sortValidatorsByBLSKey,
	validatorsEqual,
} from './utils';
import { getBFTParameters } from './bft_params';
import {
	EMPTY_KEY,
	MAX_UINT32,
	MODULE_STORE_PREFIX_BFT,
	STORE_PREFIX_BFT_PARAMETERS,
	STORE_PREFIX_BFT_VOTES,
	STORE_PREFIX_GENERATOR_KEYS,
} from './constants';
import {
	bftVotesSchema,
	BFTVotes,
	BFTParameters,
	ValidatorsHashInfo,
	ValidatorsHashInput,
	validatorsHashInputSchema,
	bftParametersSchema,
	BFTVotesActiveValidatorsVoteInfo,
	generatorKeysSchema,
} from './schemas';
import { BFTHeights, GeneratorKey, BFTValidator } from './types';
import { BFTParameterNotFoundError } from './errors';

export interface BlockHeaderAsset {
	maxHeightPrevoted: number;
	maxHeightPreviouslyForged: number;
}

export class BFTMethod {
	private _batchSize!: number;

	public init(batchSize: number) {
		this._batchSize = batchSize;
	}

	public areHeadersContradicting(bftHeader1: BlockHeader, bftHeader2: BlockHeader): boolean {
		if (bftHeader1.id.equals(bftHeader2.id)) {
			return false;
		}
		return areDistinctHeadersContradicting(bftHeader1, bftHeader2);
	}

	public async isHeaderContradictingChain(
		stateStore: StateStore,
		header: BlockHeader,
	): Promise<boolean> {
		const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
		const bftVotes = await votesStore.getWithSchema<BFTVotes>(EMPTY_KEY, bftVotesSchema);
		for (const bftBlock of bftVotes.blockBFTInfos) {
			if (bftBlock.generatorAddress.equals(header.generatorAddress)) {
				return areDistinctHeadersContradicting(bftBlock, header);
			}
		}
		return false;
	}

	public async existBFTParameters(stateStore: StateStore, height: number): Promise<boolean> {
		const paramsStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);
		return paramsStore.has(utils.intToBuffer(height, 4));
	}

	public async getBFTParameters(stateStore: StateStore, height: number): Promise<BFTParameters> {
		const paramsStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);
		return getBFTParameters(paramsStore, height);
	}

	public async getBFTHeights(stateStore: StateStore): Promise<BFTHeights> {
		const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
		const bftVotes = await votesStore.getWithSchema<BFTVotes>(EMPTY_KEY, bftVotesSchema);
		return {
			maxHeightPrevoted: bftVotes.maxHeightPrevoted,
			maxHeightPrecommitted: bftVotes.maxHeightPrecommitted,
			maxHeightCertified: bftVotes.maxHeightCertified,
		};
	}

	public async impliesMaximalPrevotes(
		stateStore: StateStore,
		header: { height: number; generatorAddress: Buffer; maxHeightGenerated: number },
	): Promise<boolean> {
		const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
		const bftVotes = await votesStore.getWithSchema<BFTVotes>(EMPTY_KEY, bftVotesSchema);
		// if blockBFTInfos is empty (ie: right after executing genesis block), next block never implies prevotes
		if (bftVotes.blockBFTInfos.length === 0) {
			return false;
		}
		const [currentTip] = bftVotes.blockBFTInfos;
		// if currentTip height is not equal (the input header is already processed) or 1 less from the height, it cannot compute impliesMaximalPrevotes
		if (currentTip.height !== header.height && currentTip.height + 1 !== header.height) {
			throw new Error(
				`Input header with height ${header.height} is invalid. It must be ${currentTip.height} or ${
					currentTip.height + 1
				}.`,
			);
		}
		// if currentTip is the same as input height, then bftVotes is already processed
		const bftVotesProcessed = currentTip.height === header.height;
		// if bftVotes is processed, header from the bftVotes is used; otherwise, input header is used.
		const currentHeader = bftVotesProcessed ? currentTip : header;
		const previousHeight = currentHeader.maxHeightGenerated;

		// the block does not imply any prevotes
		if (previousHeight >= currentHeader.height) {
			return false;
		}

		// heightCurrentTip is the latest height before bftVotes being updated
		const heightCurrentTip = currentTip.height - (bftVotesProcessed ? 1 : 0);
		const offset = heightCurrentTip - previousHeight;
		// bftInfoSize is the size before processing the bftVotes
		const bftInfoSize = bftVotes.blockBFTInfos.length - (bftVotesProcessed ? 1 : 0);
		if (offset >= bftInfoSize) {
			return true;
		}
		// block at previousHeight is generated by a different delegate and header doesn't
		// imply maximal number of prevotes
		if (!bftVotes.blockBFTInfos[offset].generatorAddress.equals(currentHeader.generatorAddress)) {
			return false;
		}
		return true;
	}

	public async getNextHeightBFTParameters(stateStore: StateStore, height: number): Promise<number> {
		const paramsStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);
		const start = utils.intToBuffer(height + 1, 4);
		const end = utils.intToBuffer(MAX_UINT32, 4);
		const results = await paramsStore.iterate({
			limit: 1,
			gte: start,
			lte: end,
		});
		if (results.length !== 1) {
			throw new BFTParameterNotFoundError();
		}
		const [result] = results;
		return result.key.readUInt32BE(0);
	}

	public async setBFTParameters(
		stateStore: StateStore,
		precommitThreshold: bigint,
		certificateThreshold: bigint,
		validators: BFTValidator[],
	): Promise<void> {
		if (validators.length > this._batchSize) {
			throw new Error(
				`Invalid validators size. The number of validators can be at most the batch size ${this._batchSize}.`,
			);
		}
		let aggregateBFTWeight = BigInt(0);
		for (const validator of validators) {
			if (validator.bftWeight <= 0) {
				throw new Error('Invalid BFT weight. BFT weight must be a positive integer.');
			}
			aggregateBFTWeight += validator.bftWeight;
		}
		if (
			aggregateBFTWeight / BigInt(3) + BigInt(1) > precommitThreshold ||
			precommitThreshold > aggregateBFTWeight
		) {
			throw new Error('Invalid precommitThreshold input.');
		}
		if (
			aggregateBFTWeight / BigInt(3) + BigInt(1) > certificateThreshold ||
			certificateThreshold > aggregateBFTWeight
		) {
			throw new Error('Invalid certificateThreshold input.');
		}
		sortValidatorsByAddress(validators);

		const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
		const bftVotes = await votesStore.getWithSchema<BFTVotes>(EMPTY_KEY, bftVotesSchema);
		// This assumes bftVotes.blockBFTInfos will contain currently executing block
		const currentHeight =
			bftVotes.blockBFTInfos.length > 0
				? bftVotes.blockBFTInfos[0].height
				: bftVotes.maxHeightPrevoted;

		let currentBFTParams: BFTParameters | undefined;
		try {
			currentBFTParams = await this.getBFTParameters(stateStore, currentHeight);
		} catch (error) {
			if (!(error instanceof BFTParameterNotFoundError)) {
				throw error;
			}
		}

		// if there is no change in params, return
		if (
			currentBFTParams &&
			validatorsEqual(currentBFTParams.validators, validators) &&
			currentBFTParams.precommitThreshold === precommitThreshold &&
			currentBFTParams.certificateThreshold === certificateThreshold
		) {
			return;
		}

		const nextHeight = currentHeight + 1;
		const validatorsHash = this._computeValidatorsHash(validators, certificateThreshold);

		const bftParams: BFTParameters = {
			prevoteThreshold: (BigInt(2) * aggregateBFTWeight) / BigInt(3) + BigInt(1),
			precommitThreshold,
			certificateThreshold,
			validators,
			validatorsHash,
		};

		const paramsStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);

		const nextHeightBytes = utils.intToBuffer(nextHeight, 4);
		await paramsStore.setWithSchema(nextHeightBytes, bftParams, bftParametersSchema);

		const nextActiveValidators: BFTVotesActiveValidatorsVoteInfo[] = [];
		for (const validator of validators) {
			const existingValidator = bftVotes.activeValidatorsVoteInfo.find(v =>
				v.address.equals(validator.address),
			);
			if (existingValidator) {
				nextActiveValidators.push(existingValidator);
				continue;
			}
			nextActiveValidators.push({
				address: validator.address,
				minActiveHeight: nextHeight,
				largestHeightPrecommit: nextHeight - 1,
			});
		}
		sortValidatorsByAddress(nextActiveValidators);
		bftVotes.activeValidatorsVoteInfo = nextActiveValidators;
		await votesStore.setWithSchema(EMPTY_KEY, bftVotes, bftVotesSchema);
	}

	public async getGeneratorKeys(stateStore: StateStore, height: number): Promise<GeneratorKey[]> {
		const keysStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_GENERATOR_KEYS);
		const { generators: validators } = await getGeneratorKeys(keysStore, height);

		return validators;
	}

	public async setGeneratorKeys(stateStore: StateStore, generators: GeneratorKey[]): Promise<void> {
		const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
		const bftVotes = await votesStore.getWithSchema<BFTVotes>(EMPTY_KEY, bftVotesSchema);
		// This assumes bftVotes.blockBFTInfos will contain currently executing block
		const nextHeight =
			bftVotes.blockBFTInfos.length > 0
				? bftVotes.blockBFTInfos[0].height + 1
				: bftVotes.maxHeightPrevoted + 1;

		const keysStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_GENERATOR_KEYS);
		const nextHeightBytes = utils.intToBuffer(nextHeight, 4);

		await keysStore.setWithSchema(nextHeightBytes, { generators }, generatorKeysSchema);
	}

	private _computeValidatorsHash(validators: BFTValidator[], certificateThreshold: bigint) {
		const activeValidators: ValidatorsHashInfo[] = [];
		for (const validator of validators) {
			activeValidators.push({
				blsKey: validator.blsKey,
				bftWeight: validator.bftWeight,
			});
		}
		sortValidatorsByBLSKey(activeValidators);
		const input: ValidatorsHashInput = {
			activeValidators,
			certificateThreshold,
		};
		const encodedValidatorsHashInput = codec.encode(validatorsHashInputSchema, input);
		return utils.hash(encodedValidatorsHashInput);
	}
}
