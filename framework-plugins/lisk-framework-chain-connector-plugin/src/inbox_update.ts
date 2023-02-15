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

import { CCMsg, ccmSchema, codec, tree, ChannelData } from 'lisk-sdk';
import { CCMsFromEvents, LastSentCCMWithHeight } from './types';

/**
 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0053.md#messagewitnesshashes
 * @description This method is to calculate messageWitnessHashes
 * if there are any pending ccms as well as it filters out ccms based on last sent ccm nonce.
 * Also, it checks whether a list of ccm can fit into a CCU based on maxCCUSize
 * @param sendingChainChannelInfo Channel info of the sendingChain stored on receivingChain
 * @param ccmsToBeIncluded Filtered list of CCMs that can be included for a given certificate
 * @param lastSentCCMInfo Last send CCM info which is used to filter out ccms
 * @param maxCCUSize Max size of CCU based of which number of ccms are selected
 */
export const calculateMessageWitnesses = (
	sendingChainChannelInfo: ChannelData,
	ccmsToBeIncluded: CCMsFromEvents[],
	lastSentCCMInfo: {
		height: number;
		nonce: bigint;
	},
	maxCCUSize: number,
): {
	crossChainMessages: Buffer[];
	messageWitnessHashes: Buffer[];
	lastCCMToBeSent: LastSentCCMWithHeight | undefined;
} => {
	// Filter all the CCMs between lastCertifiedHeight and certificate height.
	let potentialCCMs: CCMsg[] = [];

	let lastCCMHeight = 0;
	// Make an array of ccms with nonce greater than last sent ccm nonce
	for (const ccmFromEvents of ccmsToBeIncluded) {
		const { ccms } = ccmFromEvents;
		if (ccmFromEvents.height === lastSentCCMInfo.height) {
			for (const ccm of ccms.filter(c => c.nonce > lastSentCCMInfo.nonce)) {
				potentialCCMs.push(ccm);
			}
			continue;
		}
		potentialCCMs = [...potentialCCMs, ...ccms];
		lastCCMHeight = ccmFromEvents.height;
	}

	const ccmsListOfList = groupCCMsBySize(potentialCCMs, maxCCUSize);

	// Return empty inboxUpdate when there are no ccms
	if (ccmsListOfList.length < 1) {
		return {
			crossChainMessages: [],
			messageWitnessHashes: [],
			lastCCMToBeSent: undefined,
		};
	}

	if (ccmsListOfList.length === 1) {
		const firstCCMList = ccmsListOfList[0];
		const serializedCCMList = firstCCMList.map(ccm => codec.encode(ccmSchema, ccm));
		// Take the inclusion proof of the last CCM to be included.

		return {
			crossChainMessages: serializedCCMList,
			messageWitnessHashes: [],
			lastCCMToBeSent: { ...firstCCMList[0], height: lastCCMHeight },
		};
	}

	const firstCCMList = ccmsListOfList[0];
	const includedSerializedCCMList = firstCCMList.map(ccm => codec.encode(ccmSchema, ccm));

	const allSerializedCCMs = potentialCCMs.map(ccm => codec.encode(ccmSchema, ccm));
	const remainingCCMValues = allSerializedCCMs.slice(
		firstCCMList.length - 1,
		allSerializedCCMs.length - 1,
	);
	// Generate messageWitness
	const messageWitnessHashes = tree.regularMerkleTree.calculateRightWitness(
		sendingChainChannelInfo.inbox.size + firstCCMList.length,
		remainingCCMValues,
	);

	return {
		crossChainMessages: includedSerializedCCMList,
		messageWitnessHashes,
		lastCCMToBeSent: { ...firstCCMList[0], height: lastCCMHeight },
	};
};

/**
 * @description This will return lists with sub-lists, where total size of CCMs in each sub-list will be <= CCU_TOTAL_CCM_SIZE
 * Each sublist can contain CCMS from DIFFERENT heights
 */
export const groupCCMsBySize = (allCCMs: CCMsg[], maxCCUSize: number): CCMsg[][] => {
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
			if (totalSize > maxCCUSize) {
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
