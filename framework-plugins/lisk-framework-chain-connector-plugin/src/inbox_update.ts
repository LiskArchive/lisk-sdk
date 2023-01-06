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
} from 'lisk-sdk';
import { CCU_TOTAL_CCM_SIZE } from './constants';
import { CrossChainMessagesFromEvents } from './types';

export const calculateInboxUpdate = async (
	certificate: Certificate,
	lastCertificate: LastCertificate,
	crossChainMessages: CrossChainMessagesFromEvents[],
	chainConnectorPluginDB: liskDB.Database,
): Promise<InboxUpdate[]> => {
	// Filter all the CCMs to be included between lastCertifiedheight and certificate height.
	const ccmsToBeIncluded = crossChainMessages.filter(
		ccmFromEvents =>
			ccmFromEvents.height <= certificate.height && ccmFromEvents.height > lastCertificate.height,
	);
	const ccmsListOfList = groupCCMsBySize(ccmsToBeIncluded);
	// Take the inclusion proof of the last CCM to be included.
	const { inclusionProof } = ccmsToBeIncluded[ccmsToBeIncluded.length - 1];

	if (ccmsListOfList.length === 1) {
		const ccmHashesList = ccmsListOfList[0].map(ccm => codec.encode(ccmSchema, ccm));
		return [
			{
				crossChainMessages: ccmHashesList,
				messageWitnessHashes: [],
				outboxRootWitness: inclusionProof,
			},
		];
	}
	// Calculate list of inboxUpdates to be sent by multiple CCUs
	const inboxUpdates = [];

	for (let i = 0; i < ccmsListOfList.length; i += 1) {
		const subList = ccmsListOfList[i];

		const ccmHashesList = subList.map(ccm => codec.encode(ccmSchema, ccm));
		// Calculate message witnesses

		const merkleTree = new tree.MerkleTree({ db: chainConnectorPluginDB });
		for (const ccm of ccmHashesList) {
			await merkleTree.append(ccm);
		}
		const messageWitnesses = await merkleTree.generateRightWitness(ccmHashesList.length);

		const emptyInclusionProof: OutboxRootWitness = {
			bitmap: EMPTY_BYTES,
			siblingHashes: [],
		};
		inboxUpdates.push({
			crossChainMessages: ccmHashesList,
			messageWitnessHashes: messageWitnesses,
			// For first CCU we have inclusionProof and then for subsequent proofs we can leave outboxRootWitness empty
			outboxRootWitness: i === 0 ? inclusionProof : emptyInclusionProof,
		});
	}

	return inboxUpdates;
};

/**
 * This will return lists with sub-lists, where total size of CCMs in each sub-list will be <= CCU_TOTAL_CCM_SIZE
 * Each sublist can contain CCMS from DIFFERENT heights
 */
export const groupCCMsBySize = (ccmsFromEvents: CrossChainMessagesFromEvents[]): CCMsg[][] => {
	const groupedCCMsBySize: CCMsg[][] = [];

	if (ccmsFromEvents.length === 0) {
		return groupedCCMsBySize;
	}

	const allCCMs: CCMsg[] = [];
	for (const filteredCCMsFromEvent of ccmsFromEvents) {
		allCCMs.push(...filteredCCMsFromEvent.ccms);
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
