/*
 * Copyright © 2023 Lisk Foundation
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
	CCMsg,
	Certificate,
	EMPTY_BYTES,
	InboxUpdate,
	OutboxRootWitness,
	ccmSchema,
	codec,
	tree,
	db as liskDB,
	LastCertificate,
	cryptography,
} from 'lisk-sdk';
import { CCU_TOTAL_CCM_SIZE } from './constants';
import { CCMsFromEvents } from './types';

/**
 * @description When we have no new certificate and we use the lastCertificate for inboxUpdate calculation
 * @param lastCertificate
 * @param crossChainMessages
 * @param chainConnectorPluginDB
 * @param lastSentCCM
 * @returns InboxUpdate
 */
export const calculateInboxUpdateForPartialUpdate = async (
	lastCertificate: LastCertificate,
	crossChainMessages: CCMsFromEvents[],
	chainConnectorPluginDB: liskDB.Database,
	lastSentCCMInfo: {
		height: number;
		nonce: bigint;
	},
): Promise<InboxUpdate> => {
	// Filter all the CCMs between lastCertifiedHeight and certificate height.
	let potentialCCMs: CCMsg[] = [];
	// Take range from lastSentCCM height until certificate height
	const ccmsToBeIncluded = crossChainMessages.filter(
		ccmFromEvents =>
			ccmFromEvents.height >= lastSentCCMInfo.height &&
			ccmFromEvents.height <= lastCertificate.height,
	);

	for (const ccmFromEvents of ccmsToBeIncluded) {
		const { ccms } = ccmFromEvents;
		if (ccmFromEvents.height === lastSentCCMInfo.height) {
			for (const ccm of ccms.filter(c => c.nonce > lastSentCCMInfo.nonce)) {
				potentialCCMs.push(ccm);
			}
		}
		potentialCCMs = [...potentialCCMs, ...ccms];
	}
	const ccmsListOfList = groupCCMsBySize(potentialCCMs);
	// Return empty inboxUpdate when there are no ccms
	if (ccmsListOfList.length < 1) {
		return {
			crossChainMessages: [],
			messageWitnessHashes: [],
			outboxRootWitness: {
				bitmap: EMPTY_BYTES,
				siblingHashes: [],
			},
		};
	}

	const emptyInclusionProof: OutboxRootWitness = {
		bitmap: EMPTY_BYTES,
		siblingHashes: [],
	};

	const merkleTree = new tree.MerkleTree({ db: chainConnectorPluginDB });
	const firstCCMList = ccmsListOfList[0];
	const serializedCCMList = firstCCMList.map(ccm => codec.encode(ccmSchema, ccm));

	// Calculate message witnesses
	for (const ccm of serializedCCMList) {
		await merkleTree.append(cryptography.utils.hash(ccm));
	}
	const messageWitnesses = await merkleTree.generateRightWitness(serializedCCMList.length);

	return {
		crossChainMessages: serializedCCMList,
		messageWitnessHashes: messageWitnesses,
		outboxRootWitness: emptyInclusionProof,
	};
};

/**
 *
 * @param certificate
 * @param lastCertificate
 * @param crossChainMessages
 * @param lastSentCCM
 * @returns Promise<InboxUpdate>
 */
export const calculateInboxUpdate = async (
	certificate: Certificate,
	crossChainMessages: CCMsFromEvents[],
	chainConnectorPluginDB: liskDB.Database,
	lastSentCCMInfo: {
		height: number;
		nonce: bigint;
	},
): Promise<InboxUpdate> => {
	// Filter all the CCMs between lastCertifiedHeight and certificate height.
	let potentialCCMs: CCMsg[] = [];
	// Take range from lastSentCCM height until certificate height
	const ccmsToBeIncluded = crossChainMessages.filter(
		ccmFromEvents =>
			ccmFromEvents.height >= lastSentCCMInfo.height && ccmFromEvents.height <= certificate.height,
	);

	// Make an array of ccms with nonce greater than last sent ccm nonce
	for (const ccmFromEvents of ccmsToBeIncluded) {
		const { ccms } = ccmFromEvents;
		if (ccmFromEvents.height === lastSentCCMInfo.height) {
			for (const ccm of ccms.filter(c => c.nonce > lastSentCCMInfo.nonce)) {
				potentialCCMs.push(ccm);
			}
		}
		potentialCCMs = [...potentialCCMs, ...ccms];
	}
	const ccmsListOfList = groupCCMsBySize(potentialCCMs);

	// Return empty inboxUpdate when there are no ccms
	if (ccmsListOfList.length < 1) {
		return {
			crossChainMessages: [],
			messageWitnessHashes: [],
			outboxRootWitness: {
				bitmap: EMPTY_BYTES,
				siblingHashes: [],
			},
		};
	}
	const { inclusionProof } = ccmsToBeIncluded[ccmsToBeIncluded.length - 1];

	if (ccmsListOfList.length === 1) {
		const firstCCMList = ccmsListOfList[0];
		const serializedCCMList = firstCCMList.map(ccm => codec.encode(ccmSchema, ccm));
		// Take the inclusion proof of the last CCM to be included.

		return {
			crossChainMessages: serializedCCMList,
			messageWitnessHashes: [],
			outboxRootWitness: inclusionProof,
		};
	}

	const merkleTree = new tree.MerkleTree({ db: chainConnectorPluginDB });
	const firstCCMList = ccmsListOfList[0];
	const serializedCCMList = firstCCMList.map(ccm => codec.encode(ccmSchema, ccm));

	// Calculate message witnesses when not all the ccms can be included
	for (const ccm of serializedCCMList) {
		await merkleTree.append(cryptography.utils.hash(ccm));
	}
	const messageWitnesses = await merkleTree.generateRightWitness(serializedCCMList.length);

	return {
		crossChainMessages: serializedCCMList,
		messageWitnessHashes: messageWitnesses,
		outboxRootWitness: inclusionProof,
	};
};

/**
 * @description This will return lists with sub-lists, where total size of CCMs in each sub-list will be <= CCU_TOTAL_CCM_SIZE
 * Each sublist can contain CCMS from DIFFERENT heights
 * @param allCCMs
 * @returns CCMsg[][]
 */
export const groupCCMsBySize = (allCCMs: CCMsg[]): CCMsg[][] => {
	const groupedCCMsBySize: CCMsg[][] = [];

	if (allCCMs.length === 0) {
		return groupedCCMsBySize;
	}

	// This will group/bundle CCMs in a list where total size of the list will be <= CCU_TOTAL_CCM_SIZE
	const groupBySize = (startIndex: number): [list: CCMsg[], newIndex: number] => {
		const newList: CCMsg[] = [];
		let totalSize = 0;
		let i = startIndex;

		for (; i < allCCMs.length; i += 1) {
			const ccm = allCCMs[i];
			const ccmBytes = codec.encode(ccmSchema, ccm);
			const size = ccmBytes.length;
			totalSize += size;
			if (totalSize > CCU_TOTAL_CCM_SIZE) {
				return [newList, i];
			}

			newList.push(ccm);
		}

		return [newList, i];
	};

	const buildGroupsBySize = (startIndex: number) => {
		const [list, lastIndex] = groupBySize(startIndex);
		groupedCCMsBySize.push(list);

		if (lastIndex < allCCMs.length) {
			buildGroupsBySize(lastIndex);
		}
	};

	buildGroupsBySize(0);
	return groupedCCMsBySize;
};
