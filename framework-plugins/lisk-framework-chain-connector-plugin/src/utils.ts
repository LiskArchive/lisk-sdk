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
	ChainAccount,
	ChainAccountJSON,
	ChannelData,
	ChannelDataJSON,
	Inbox,
	InboxJSON,
	Outbox,
	OutboxJSON,
	BFTParameters,
	ProveResponse,
} from 'lisk-sdk';

import {
	BFTParametersJSON,
	CCMsFromEvents,
	CCMsFromEventsJSON,
	ProveResponseJSON,
	ValidatorsData,
} from './types';

import { CHAIN_ID_LENGTH } from './constants';

interface BFTParametersWithoutGeneratorKey extends Omit<BFTParameters, 'validators'> {
	validators: {
		address: Buffer;
		bftWeight: bigint;
		blsKey: Buffer;
	}[];
}

export const getMainchainID = (chainID: Buffer): Buffer => {
	const networkID = chainID.subarray(0, 1);
	// 3 bytes for remaining chainID bytes
	return Buffer.concat([networkID, Buffer.alloc(CHAIN_ID_LENGTH - 1, 0)]);
};

export const aggregateCommitToJSON = (aggregateCommit: AggregateCommit) => ({
	height: aggregateCommit.height,
	aggregationBits: aggregateCommit.aggregationBits.toString('hex'),
	certificateSignature: aggregateCommit.certificateSignature.toString('hex'),
});

export const ccmsFromEventsToJSON = (ccmsFromEvents: CCMsFromEvents): CCMsFromEventsJSON => ({
	ccms: ccmsFromEvents.ccms.map(ccm => ({
		...ccm,
		fee: ccm.fee.toString(),
		nonce: ccm.nonce.toString(),
		params: ccm.params.toString('hex'),
		receivingChainID: ccm.receivingChainID.toString('hex'),
		sendingChainID: ccm.sendingChainID.toString('hex'),
	})),
	height: ccmsFromEvents.height,
	inclusionProof: {
		bitmap: ccmsFromEvents.inclusionProof.bitmap.toString('hex'),
		siblingHashes: ccmsFromEvents.inclusionProof.siblingHashes.map(s => s.toString('hex')),
	},
	outboxSize: ccmsFromEvents.outboxSize,
});

export const validatorsHashPreimagetoJSON = (validatorsHashPreimage: ValidatorsData[]) => {
	const validatorsHashPreimageJSON = [];
	for (const validatorData of validatorsHashPreimage) {
		const validatorsJSON = validatorData.validators.map(v => ({
			address: v.address.toString('hex'),
			bftWeight: v.bftWeight.toString(),
			blsKey: v.blsKey.toString('hex'),
		}));
		validatorsHashPreimageJSON.push({
			certificateThreshold: validatorData.certificateThreshold.toString(),
			validators: validatorsJSON,
			validatorsHash: validatorData.validatorsHash.toString('hex'),
		});
	}
	return validatorsHashPreimageJSON;
};

export const channelDataToJSON = (channelData: ChannelData) => {
	const { inbox, messageFeeTokenID, outbox, partnerChainOutboxRoot, minReturnFeePerByte } =
		channelData;
	const inboxJSON: InboxJSON = {
		appendPath: inbox.appendPath.map(ap => ap.toString('hex')),
		root: inbox.root.toString('hex'),
		size: inbox.size,
	};

	const outboxJSON: OutboxJSON = {
		appendPath: outbox.appendPath.map(ap => ap.toString('hex')),
		root: outbox.root.toString('hex'),
		size: outbox.size,
	};

	return {
		messageFeeTokenID,
		outbox: outboxJSON,
		inbox: inboxJSON,
		partnerChainOutboxRoot: partnerChainOutboxRoot.toString('hex'),
		minReturnFeePerByte: minReturnFeePerByte.toString(),
	};
};

export const channelDataJSONToObj = (channelData: ChannelDataJSON): ChannelData => {
	const { inbox, messageFeeTokenID, outbox, partnerChainOutboxRoot, minReturnFeePerByte } =
		channelData;

	const inboxJSON: Inbox = {
		appendPath: inbox.appendPath.map(ap => Buffer.from(ap, 'hex')),
		root: Buffer.from(inbox.root, 'hex'),
		size: inbox.size,
	};

	const outboxJSON: Outbox = {
		appendPath: outbox.appendPath.map(ap => Buffer.from(ap, 'hex')),
		root: Buffer.from(outbox.root, 'hex'),
		size: outbox.size,
	};

	return {
		messageFeeTokenID: Buffer.from(messageFeeTokenID, 'hex'),
		outbox: outboxJSON,
		inbox: inboxJSON,
		partnerChainOutboxRoot: Buffer.from(partnerChainOutboxRoot, 'hex'),
		minReturnFeePerByte: BigInt(minReturnFeePerByte),
	};
};

export const chainAccountDataJSONToObj = (chainAccountJSON: ChainAccountJSON): ChainAccount => {
	const { lastCertificate } = chainAccountJSON;
	return {
		...chainAccountJSON,
		lastCertificate: {
			height: lastCertificate.height,
			stateRoot: Buffer.from(lastCertificate.stateRoot, 'hex'),
			timestamp: lastCertificate.timestamp,
			validatorsHash: Buffer.from(lastCertificate.validatorsHash, 'hex'),
		},
	};
};

export const proveResponseJSONToObj = (proveResponseJSON: ProveResponseJSON): ProveResponse => {
	const {
		proof: { queries, siblingHashes },
	} = proveResponseJSON;

	return {
		proof: {
			queries: queries.map(query => ({
				bitmap: Buffer.from(query.bitmap, 'hex'),
				key: Buffer.from(query.key, 'hex'),
				value: Buffer.from(query.value, 'hex'),
			})),
			siblingHashes: siblingHashes.map(siblingHash => Buffer.from(siblingHash, 'hex')),
		},
	};
};

export const bftParametersJSONToObj = (
	bftParametersJSON: BFTParametersJSON,
): BFTParametersWithoutGeneratorKey => {
	const { certificateThreshold, precommitThreshold, prevoteThreshold, validators, validatorsHash } =
		bftParametersJSON;

	return {
		certificateThreshold: BigInt(certificateThreshold),
		precommitThreshold: BigInt(precommitThreshold),
		prevoteThreshold: BigInt(prevoteThreshold),
		validators: validators.map(validator => ({
			address: Buffer.from(validator.address, 'hex'),
			bftWeight: BigInt(validator.bftWeight),
			blsKey: Buffer.from(validator.blsKey, 'hex'),
		})),
		validatorsHash: Buffer.from(validatorsHash, 'hex'),
	};
};
