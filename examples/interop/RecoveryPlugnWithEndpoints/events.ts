import { apiClient, CCMsg, MODULE_NAME_INTEROPERABILITY, Schema, codec } from 'lisk-sdk';
import { CcmSendSuccessEventData, CcmProcessedEventData } from 'lisk-framework';
import { BlockHeaderAttrs } from '@liskhq/lisk-chain';
import { BlockEvents, ModulesMetadata, ModuleMetadata } from './types';
import { EVENT_NAME_CCM_PROCESSED } from 'lisk-framework/dist-node/modules/interoperability/constants';
import { getDBInstance } from './db/db';
import { EventsDb } from './db/EventsDb';

// How long this script be executed ?
// If a chain is terminated, should we terminate this script also ? If yes, then how we will collect
// CCMS for next recovery (when the same chain is activated & terminated again ?
export const parseCCMs = async (
	newBlockHeader: BlockHeaderAttrs,
	mainchainClient: apiClient.APIClient,
): Promise<void> => {
	const eventsModel = new EventsDb(await getDBInstance());
	const allCCMs = await eventsModel.getCCMs();

	// Check for events if any and store them
	const blockEvents = await mainchainClient.invoke<BlockEvents>('chain_getEvents', {
		height: newBlockHeader.height,
	});

	const ccmsFromEvents: CCMsg[] = [];
	const interopMetadata = await _getModulesMetadata(mainchainClient);

	_parseCCMSendSuccessEvents(ccmsFromEvents, interopMetadata, blockEvents);
	_parseCCMProcessedEvents(ccmsFromEvents, interopMetadata, blockEvents);

	for (const ccmFromEvent of ccmsFromEvents) {
		allCCMs.push(ccmFromEvent);
	}

	await eventsModel.setCCMs(allCCMs);
};

const _parseCCMSendSuccessEvents = (
	ccmsFromEvents: CCMsg[],
	moduleMetadata: ModuleMetadata,
	blockEvents: BlockEvents,
): void => {
	const filteredByName = _filterByName(blockEvents, 'ccmSendSuccess');
	if (filteredByName) {
		const data = _getEventData(moduleMetadata, 'ccmSendSuccess');
		for (const ccmSendSuccessEvent of filteredByName) {
			const ccmSendSuccessEventData = codec.decode<CcmSendSuccessEventData>(
				data,
				Buffer.from(ccmSendSuccessEvent.data, 'hex'),
			);

			// Do we need to filter based on `ccm.sendingChainID = mainchain ?
			const ccm = ccmSendSuccessEventData.ccm;
			if (ccm.sendingChainID.equals(Buffer.from('04000000', 'hex'))) {
				ccmsFromEvents.push(ccm);
			}
		}
	}
};

const _parseCCMProcessedEvents = (
	ccmsFromEvents: CCMsg[],
	moduleMetadata: ModuleMetadata,
	blockEvents: BlockEvents,
): void => {
	const filteredByName = _filterByName(blockEvents, EVENT_NAME_CCM_PROCESSED);
	if (filteredByName) {
		const data = _getEventData(moduleMetadata, EVENT_NAME_CCM_PROCESSED);
		for (const ccmProcessedEvent of filteredByName) {
			const ccmProcessedEventData = codec.decode<CcmProcessedEventData>(
				data,
				Buffer.from(ccmProcessedEvent.data, 'hex'),
			);

			// Do we need to filter based on `ccm.sendingChainID = mainchain ?
			const ccm = ccmProcessedEventData.ccm;
			if (ccm.sendingChainID.equals(Buffer.from('04000000', 'hex'))) {
				ccmsFromEvents.push(ccm);
			}
		}
	}
};

const _filterByName = (blockEvents: BlockEvents, name: string): BlockEvents | undefined => {
	return blockEvents.filter(
		eventAttr => eventAttr.module === MODULE_NAME_INTEROPERABILITY && eventAttr.name === name,
	);
};

const _getEventData = (moduleMetadata: ModuleMetadata, name: string): Schema => {
	const eventInfo = moduleMetadata.events.filter(event => event.name === name);
	if (!eventInfo?.[0]?.data) {
		throw new Error(`No schema found for ${name} event data.`);
	}
	return eventInfo?.[0]?.data;
};

const _getModulesMetadata = async (mainchainClient: apiClient.APIClient) => {
	const { modules: modulesMetadata } = await mainchainClient.invoke<{ modules: ModulesMetadata }>(
		'system_getMetadata',
	);
	const interoperabilityMetadata = modulesMetadata.find(
		metadata => metadata.name === MODULE_NAME_INTEROPERABILITY,
	);
	if (!interoperabilityMetadata) {
		throw new Error(`No metadata found for ${MODULE_NAME_INTEROPERABILITY} module.`);
	}

	return interoperabilityMetadata;
};
