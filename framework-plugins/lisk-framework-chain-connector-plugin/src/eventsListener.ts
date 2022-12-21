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
	chain,
	CCMsg,
	JSONObject,
	codec,
	CcmSendSuccessEventData,
	CcmProcessedEventData,
	CCMProcessedResult,
	apiClient,
} from 'lisk-sdk';
import { MODULE_NAME_INTEROPERABILITY, CCM_SEND_SUCCESS, CCM_PROCESSED } from './constants';
import { BlockHeader, metadata } from './types';

export class EventsListener {
	private readonly _sidechainAPIClient!: apiClient.APIClient;

	public constructor(chainApiClient: apiClient.APIClient) {
		this._sidechainAPIClient = chainApiClient;
	}

	public async getEvents(
		interopModule: metadata,
		newBlockHeader: BlockHeader,
	): Promise<CCMsg[] | undefined> {
		const ccmsFromEvents: CCMsg[] = [];

		// Check for events if any and store them
		const events = await this._sidechainAPIClient.invoke<JSONObject<chain.EventAttr[]>>(
			'chain_getEvents',
			{ height: newBlockHeader.height },
		);
		if (!events) {
			return undefined;
		}

		const filterByName = (name: string) =>
			events.filter(
				eventAttr => eventAttr.name === name && eventAttr.module === MODULE_NAME_INTEROPERABILITY,
			);

		const ccmSendSuccessEvents = filterByName(CCM_SEND_SUCCESS);
		const ccmProcessedEvents = filterByName(CCM_PROCESSED);
		if (ccmSendSuccessEvents.length === 0 && ccmProcessedEvents.length === 0) {
			return undefined;
		}

		const getDataFromModuleEvents = (name: string) => {
			const ccmEventInfo = interopModule?.events.filter(e => e.name === name);
			const data = ccmEventInfo?.[0]?.data;
			if (!data) {
				throw new Error(`No schema found for "{name}" event data.`);
			}
			return data;
		};

		// Save ccm send success events
		if (ccmSendSuccessEvents.length > 0) {
			const data = getDataFromModuleEvents(CCM_SEND_SUCCESS);
			for (const e of ccmSendSuccessEvents) {
				const ccmSendSuccessEventData = codec.decode<CcmSendSuccessEventData>(
					data,
					Buffer.from(e.data, 'hex'),
				);
				ccmsFromEvents.push(ccmSendSuccessEventData.ccm);
			}
		}

		// Save ccm processed events based on CCMProcessedResult FORWARDED = 1
		if (ccmProcessedEvents.length > 0) {
			const data = getDataFromModuleEvents(CCM_PROCESSED);
			for (const e of ccmProcessedEvents) {
				const ccmProcessedEventData = codec.decode<CcmProcessedEventData>(
					data,
					Buffer.from(e.data, 'hex'),
				);
				if (ccmProcessedEventData.result === CCMProcessedResult.FORWARDED) {
					ccmsFromEvents.push(ccmProcessedEventData.ccm);
				}
			}
		}

		return ccmsFromEvents;
	}
}
