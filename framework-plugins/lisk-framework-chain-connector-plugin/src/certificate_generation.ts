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
	computeCertificateFromBlockHeader,
	LastCertificate,
} from 'lisk-sdk';
import { BlockHeader, ValidatorsData } from './types';

export const getCertificateFromAggregateCommit = (
	aggregateCommit: AggregateCommit,
	blockHeaders: BlockHeader[],
): Certificate => {
	const blockHeader = blockHeaders.find(header => header.height === aggregateCommit.height);

	if (!blockHeader) {
		throw new Error('No Block header found for the given aggregate height.');
	}

	const certificate = computeCertificateFromBlockHeader(new chain.BlockHeader(blockHeader));
	certificate.aggregationBits = blockHeader.aggregateCommit.aggregationBits;
	certificate.signature = aggregateCommit.certificateSignature;

	return certificate;
};

export const checkChainOfTrust = (
	lastValidatorsHash: Buffer,
	blsKeyToBFTWeight: Record<string, bigint>,
	lastCertificateThreshold: bigint,
	aggregateCommit: AggregateCommit,
	blockHeaders: BlockHeader[],
	validatorsHashPreimages: ValidatorsData[],
): boolean => {
	const blockHeader = blockHeaders.find(header => header.height === aggregateCommit.height - 1);

	if (!blockHeader) {
		throw new Error('No Block header found for the given aggregate height.');
	}

	// Certificate signers and certificate threshold for aggregateCommit are those authenticated by the last certificate
	if (lastValidatorsHash === blockHeader.validatorsHash) {
		return true;
	}

	let aggregateBFTWeight = BigInt(0);
	const validatorData = validatorsHashPreimages.find(
		data => data.validatorsHash === blockHeader.validatorsHash,
	);

	if (!validatorData) {
		throw new Error('No Validators data found for the given validatorsHash.');
	}

	for (let i = 0; i < validatorData.validators.length; i += 1) {
		if (aggregateCommit.aggregationBits[i] === 1) {
			const blsKey = validatorData.validators[i].blsKey.toString('hex');
			if (!blsKeyToBFTWeight[blsKey]) {
				return false;
			}

			aggregateBFTWeight += blsKeyToBFTWeight[blsKey];
		}
	}

	return aggregateBFTWeight >= lastCertificateThreshold;
};

export const getNextCertificateFromAggregateCommits = (
	blockHeaders: BlockHeader[],
	aggregateCommits: AggregateCommit[],
	validatorsHashPreimages: ValidatorsData[],
	bftHeights: BFTHeights,
	lastCertificate: LastCertificate,
): Certificate | undefined => {
	const blockHeader = blockHeaders.find(header => header.height === lastCertificate.height);

	if (!blockHeader) {
		throw new Error('No blockHeader found for the last certified height.');
	}
	const validatorData = validatorsHashPreimages.find(
		data => data.validatorsHash === blockHeader?.validatorsHash,
	);

	if (!validatorData) {
		throw new Error('No validatorsHash preimage data present for the given validatorsHash.');
	}

	const blsKeyToBFTWeight: Record<string, bigint> = {};

	for (const validator of validatorData.validators) {
		blsKeyToBFTWeight[validator.blsKey.toString('hex')] = validator.bftWeight;
	}

	let height = bftHeights.maxHeightCertified;

	while (height > lastCertificate.height) {
		if (aggregateCommits[height] !== undefined && blockHeader.validatorsHash) {
			const valid = checkChainOfTrust(
				blockHeader.validatorsHash,
				blsKeyToBFTWeight,
				validatorData.certificateThreshold,
				aggregateCommits[height],
				blockHeaders,
				validatorsHashPreimages,
			);

			if (valid) {
				return getCertificateFromAggregateCommit(aggregateCommits[height], blockHeaders);
			}
		}

		height -= 1;
	}

	return undefined;
};
