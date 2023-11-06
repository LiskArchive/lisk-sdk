/*
 * Copyright © 2022 Lisk Foundation
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

import {
	AggregateCommit,
	BFTHeights,
	Certificate,
	chain,
	computeUnsignedCertificateFromBlockHeader,
	LastCertificate,
} from 'lisk-sdk';
import { BlockHeader, ValidatorsData } from './types';

/**
 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0061.md#getcertificatefromaggregatecommit
 */
export const getCertificateFromAggregateCommit = (
	aggregateCommit: AggregateCommit,
	blockHeaders: BlockHeader[],
): Certificate => {
	const blockHeader = blockHeaders.find(header => header.height === aggregateCommit.height);

	if (!blockHeader) {
		throw new Error(
			`No block header found for the given aggregate height ${aggregateCommit.height} when calling getCertificateFromAggregateCommit.`,
		);
	}

	return {
		...computeUnsignedCertificateFromBlockHeader(new chain.BlockHeader(blockHeader)),
		aggregationBits: aggregateCommit.aggregationBits,
		signature: aggregateCommit.certificateSignature,
	};
};

/**
 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0061.md#execution-8
 */
export const checkChainOfTrust = (
	lastValidatorsHash: Buffer,
	blsKeyToBFTWeight: Record<string, bigint>,
	lastCertificateThreshold: bigint,
	aggregateCommit: AggregateCommit,
	blockHeaders: BlockHeader[],
	validatorsHashPreimage: ValidatorsData[],
): boolean => {
	const blockHeader = blockHeaders.find(header => header.height === aggregateCommit.height - 1);
	if (!blockHeader) {
		throw new Error(
			`No block header found for the given the previous height ${
				aggregateCommit.height - 1
			} of aggregate commit at height ${aggregateCommit.height} when calling checkChainOfTrust.`,
		);
	}

	// Certificate signers and certificate threshold for aggregateCommit are those authenticated by the last certificate
	if (lastValidatorsHash.equals(blockHeader.validatorsHash)) {
		return true;
	}

	let aggregateBFTWeight = BigInt(0);
	const validatorData = validatorsHashPreimage.find(data =>
		data.validatorsHash.equals(blockHeader.validatorsHash),
	);
	if (!validatorData) {
		throw new Error(
			`No validators data found for the given validatorsHash ${blockHeader.validatorsHash.toString(
				'hex',
			)}.`,
		);
	}

	for (let i = 0; i < validatorData.validators.length; i += 1) {
		if (aggregateCommit.aggregationBits.toString('hex')[i] === '1') {
			const blsKey = validatorData.validators[i].blsKey.toString('hex');
			// Aggregate commit must only be signed by BLS keys known to the other chain
			if (!blsKeyToBFTWeight[blsKey]) {
				return false;
			}

			aggregateBFTWeight += blsKeyToBFTWeight[blsKey];
		}
	}

	return aggregateBFTWeight >= lastCertificateThreshold;
};

/**
 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0061.md#execution-8
 */
export const getNextCertificateFromAggregateCommits = (
	blockHeaders: BlockHeader[],
	aggregateCommits: AggregateCommit[],
	validatorsHashPreimage: ValidatorsData[],
	bftHeights: BFTHeights,
	lastCertificate: LastCertificate,
): Certificate | undefined => {
	const blockHeaderAtLastCertifiedHeight = blockHeaders.find(
		header => header.height === lastCertificate.height,
	);
	if (!blockHeaderAtLastCertifiedHeight) {
		throw new Error(
			`No block header found for the last certified height ${lastCertificate.height}.`,
		);
	}

	const validatorDataAtLastCertifiedHeight = validatorsHashPreimage.find(data =>
		data.validatorsHash.equals(blockHeaderAtLastCertifiedHeight?.validatorsHash),
	);
	if (!validatorDataAtLastCertifiedHeight) {
		throw new Error(
			`No validatorsHash preimage data present for the given validatorsHash ${blockHeaderAtLastCertifiedHeight?.validatorsHash.toString(
				'hex',
			)}.`,
		);
	}

	const blsKeyToBFTWeight: Record<string, bigint> = {};

	for (const validator of validatorDataAtLastCertifiedHeight.validators) {
		blsKeyToBFTWeight[validator.blsKey.toString('hex')] = validator.bftWeight;
	}

	let height = bftHeights.maxHeightCertified;

	while (height > lastCertificate.height) {
		// eslint-disable-next-line no-loop-func
		const aggregateCommitAtHeight = aggregateCommits.find(a => a.height === height);

		if (aggregateCommitAtHeight !== undefined) {
			// Verify whether the chain of trust is maintained, i.e., the certificate corresponding to
			// aggregateCommits[h] would be accepted by blockchain B.
			const valid = checkChainOfTrust(
				blockHeaderAtLastCertifiedHeight.validatorsHash,
				blsKeyToBFTWeight,
				validatorDataAtLastCertifiedHeight.certificateThreshold,
				aggregateCommitAtHeight,
				blockHeaders,
				validatorsHashPreimage,
			);

			if (valid) {
				return getCertificateFromAggregateCommit(aggregateCommitAtHeight, blockHeaders);
			}
		}

		height -= 1;
	}

	return undefined;
};
