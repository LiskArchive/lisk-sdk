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
	apiClient,
	BFTHeights,
	Certificate,
	chain,
	ChainAccount,
	ChainStatus,
	computeCertificateFromBlockHeader,
	cryptography,
	LastCertificate,
	LIVENESS_LIMIT,
	MESSAGE_TAG_CERTIFICATE,
} from 'lisk-sdk';
import { BlockHeader, ValidatorsData } from './types';
import { ChainConnectorStore } from './db';

interface CertificateValidationResult {
	status: boolean;
	message?: string;
}

// LIP: https://github.com/LiskHQ/lips/blob/main/proposals/lip-0061.md#getcertificatefromaggregatecommit
export const getCertificateFromAggregateCommit = (
	aggregateCommit: AggregateCommit,
	blockHeaders: BlockHeader[],
): Certificate => {
	const blockHeader = blockHeaders.find(header => header.height === aggregateCommit.height);

	if (!blockHeader) {
		throw new Error('No block header found for the given aggregate height.');
	}

	return {
		...computeCertificateFromBlockHeader(new chain.BlockHeader(blockHeader)),
		aggregationBits: aggregateCommit.aggregationBits,
		signature: aggregateCommit.certificateSignature,
	};
};

// LIP: https://github.com/LiskHQ/lips/blob/main/proposals/lip-0061.md#execution-8
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
		throw new Error('No block header found for the given aggregate height.');
	}

	// Certificate signers and certificate threshold for aggregateCommit are those authenticated by the last certificate
	if (lastValidatorsHash === blockHeader.validatorsHash) {
		return true;
	}

	let aggregateBFTWeight = BigInt(0);
	const validatorData = validatorsHashPreimage.find(
		data => data.validatorsHash === blockHeader.validatorsHash,
	);
	if (!validatorData) {
		throw new Error('No validators data found for the given validatorsHash.');
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

// LIP: https://github.com/LiskHQ/lips/blob/main/proposals/lip-0061.md#execution-8
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
		throw new Error('No block header found for the last certified height.');
	}

	const validatorDataAtLastCertifiedHeight = validatorsHashPreimage.find(
		data => data.validatorsHash === blockHeaderAtLastCertifiedHeight?.validatorsHash,
	);
	if (!validatorDataAtLastCertifiedHeight) {
		throw new Error('No validatorsHash preimage data present for the given validatorsHash.');
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

export const validateCertificate = async (
	certificateBytes: Buffer,
	certificate: Certificate,
	blockHeader: BlockHeader,
	chainAccount: ChainAccount,
	sendingChainID: Buffer,
	chainConnectorStore: ChainConnectorStore,
	receivingChainAPIClient: apiClient.APIClient,
	isReceivingChainIsMainchain: boolean,
): Promise<CertificateValidationResult> => {
	if (chainAccount.status === ChainStatus.TERMINATED) {
		return {
			message: 'Sending chain is terminated.',
			status: false,
		};
	}

	if (certificate.height <= chainAccount.lastCertificate.height) {
		return {
			message: 'Certificate height is higher than last certified height.',
			status: false,
		};
	}

	// Verify liveness when receiving chain is not mainchain
	if (!isReceivingChainIsMainchain) {
		const isCertificateLivenessValid = await verifyLiveness(
			sendingChainID,
			certificate.timestamp,
			blockHeader.timestamp,
			receivingChainAPIClient,
		);

		if (!isCertificateLivenessValid) {
			return {
				message: 'Liveness validation failed.',
				status: false,
			};
		}
	}

	const validatorsHashPreimage = await chainConnectorStore.getValidatorsHashPreimage();
	const validatorData = validatorsHashPreimage.find(data =>
		data.validatorsHash.equals(blockHeader.validatorsHash),
	);

	if (!validatorData) {
		return {
			status: false,
			message: 'Block validators are not valid.',
		};
	}

	const keysList = validatorData.validators.map(validator => validator.blsKey);

	const weights = validatorData.validators.map(validator => validator.bftWeight);

	const hasValidWeightedAggSig = cryptography.bls.verifyWeightedAggSig(
		keysList,
		certificate.aggregationBits as Buffer,
		certificate.signature as Buffer,
		MESSAGE_TAG_CERTIFICATE,
		sendingChainID,
		certificateBytes,
		weights,
		validatorData.certificateThreshold,
	);

	if (!hasValidWeightedAggSig) {
		return {
			message: 'Weighted aggregate signature is not valid.',
			status: false,
		};
	}

	return {
		message: 'Weighted aggregate signature is not valid.',
		status: true,
	};
};

export const verifyLiveness = async (
	chainID: Buffer,
	certificateTimestamp: number,
	blockTimestamp: number,
	receivingChainAPIClient: apiClient.APIClient,
): Promise<boolean> => {
	const isLive = await receivingChainAPIClient.invoke<boolean>('interoperability_isLive', {
		chainID,
		timestamp: certificateTimestamp,
	});

	return isLive && blockTimestamp - certificateTimestamp < LIVENESS_LIMIT / 2;
};
