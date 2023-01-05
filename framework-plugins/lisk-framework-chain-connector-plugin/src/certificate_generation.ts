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

// LIP: https://github.com/LiskHQ/lips/blob/main/proposals/lip-0061.md#getcertificatefromaggregatecommit
export const getCertificateFromAggregateCommit = (
	aggregateCommit: AggregateCommit,
	blockHeaders: BlockHeader[],
): Certificate => {
	const blockHeader = blockHeaders.find(header => header.height === aggregateCommit.height);

	if (!blockHeader) {
		throw new Error('No Block header found for the given aggregate height.');
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
		throw new Error('No Block header found for the given aggregate height.');
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
		throw new Error('No Validators data found for the given validatorsHash.');
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
		throw new Error('No blockHeader found for the last certified height.');
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

interface LivenessValidationResult {
	status: boolean;
	isLive: boolean;
	chainID: Buffer;
	certificateTimestamp: number;
	blockTimestamp: number;
}

interface CertificateValidationResult {
	status: boolean;
	livenessValidationResult?: LivenessValidationResult;
	chainStatus: number;
	certificate: Certificate;
	blockHeader: BlockHeader;
	hasValidBLSWeightedAggSig?: boolean;
	message: string;
}

export const validateCertificate = async (
	certificateBytes: Buffer,
	certificate: Certificate,
	blockHeader: BlockHeader,
	chainAccount: ChainAccount,
	sendingChainID: Buffer,
	sidechainChainConnectorStore: ChainConnectorStore,
	mainchainAPIClient: apiClient.APIClient,
): Promise<CertificateValidationResult> => {
	const result: CertificateValidationResult = {
		status: false,
		chainStatus: chainAccount.status,
		certificate,
		blockHeader,
		message: 'Certificate validation failed.',
	};

	if (chainAccount.status === ChainStatus.TERMINATED) {
		result.message = 'Sending chain is terminated.';
		return result;
	}

	if (certificate.height <= chainAccount.lastCertificate.height) {
		result.message = 'Certificate height is higher than last certified height.';
		return result;
	}

	const certificateLivenessValidationResult = await verifyLiveness(
		sendingChainID,
		certificate.timestamp,
		blockHeader.timestamp,
		mainchainAPIClient,
	);

	result.livenessValidationResult = certificateLivenessValidationResult;

	if (!certificateLivenessValidationResult.status) {
		result.message = 'Liveness validation failed.';
		return result;
	}

	if (chainAccount.status === ChainStatus.ACTIVE) {
		result.status = true;

		return result;
	}

	const validatorsHashPreimage = await sidechainChainConnectorStore.getValidatorsHashPreimage();
	const validatorData = validatorsHashPreimage.find(data =>
		data.validatorsHash.equals(blockHeader.validatorsHash),
	);

	if (!validatorData) {
		result.message = 'Block validators are not valid.';

		return result;
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
	if (hasValidWeightedAggSig) {
		result.hasValidBLSWeightedAggSig = true;
		result.status = false;
		return result;
	}

	result.message = 'Weighted aggregate signature is not valid.';

	return result;
};

export const verifyLiveness = async (
	chainID: Buffer,
	certificateTimestamp: number,
	blockTimestamp: number,
	mainchainAPIClient: apiClient.APIClient,
): Promise<LivenessValidationResult> => {
	const isLive = await mainchainAPIClient.invoke<boolean>('interoperability_isLive', {
		chainID,
		timestamp: certificateTimestamp,
	});

	const result: LivenessValidationResult = {
		status: true,
		isLive,
		chainID,
		certificateTimestamp,
		blockTimestamp,
	};

	if (isLive && blockTimestamp - certificateTimestamp < LIVENESS_LIMIT / 2) {
		return result;
	}

	result.status = false;

	return result;
};
