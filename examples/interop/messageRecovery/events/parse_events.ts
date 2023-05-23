// The complete Merkle tree with root equal to the last value of the outboxRoot property of the terminated outbox account
// can be computed from the history of the Lisk mainchain

// const terminatedOutboxAccountOutboxRoot = fetch from terminated outbox account

// target Events to parse
// EVENT_NAME_CCM_SEND_SUCCESS (LIP 43, on chain registration)
// EVENT_NAME_CCM_PROCESSED (LIP 53)
// EVENT_NAME_TRANSFER_CROSS_CHAIN (LIP 51, token transfer)
//
//
// framework/src/modules/interoperability/events/ccm_send_fail.ts
// framework-plugins/lisk-framework-chain-connector-plugin/src/chain_connector_plugin.ts

// Can we parse all CCM event types ? (check all types in interop module events.ts file (the ones having `ccm: CCMsg;` as field in XxxEventData class)
// Which ones to target/parse ?
// Only the ones which satisfy `ccmSchema`. Why ?
import {
	chain,
	CCMsg,
	JSONObject,
	MODULE_NAME_INTEROPERABILITY,
	Schema,
	apiClient,
	db,
	db as liskDB,
} from 'lisk-sdk';
import { codec } from '@liskhq/lisk-codec';
import { CcmSendSuccessEventData, CcmProcessedEventData, ccmSchema } from 'lisk-framework';
import {
	EVENT_NAME_CCM_SEND_SUCCESS,
	EVENT_NAME_CCM_PROCESSED,
} from 'lisk-framework/dist-node/modules/interoperability/constants';
import { join } from 'path';
import * as os from 'os';
import { ensureDir } from 'fs-extra';

export const checkDBError = (error: Error | unknown) => {
	if (!(error instanceof liskDB.NotFoundError)) {
		throw error;
	}
};

type ModuleMetadata = {
	stores: { key: string; data: Schema }[];
	events: { name: string; data: Schema }[];
	name: string;
};

type ModulesMetadata = [ModuleMetadata];

interface Data {
	readonly blockHeader: chain.BlockHeaderJSON;
}

const getInteropAndTokenModulesMetadata = async (mainchainClient: apiClient.APIClient) => {
	const { modules: modulesMetadata } = await mainchainClient.invoke<{ modules: ModulesMetadata }>(
		'system_getMetadata',
	);
	const interoperabilityMetadata = modulesMetadata.find(
		metadata => metadata.name === MODULE_NAME_INTEROPERABILITY,
	);
	if (!interoperabilityMetadata) {
		throw new Error(`No metadata found for ${MODULE_NAME_INTEROPERABILITY} module.`);
	}

	const tokenMetadata = modulesMetadata.find(metadata => metadata.name === 'token');
	if (!tokenMetadata) {
		throw new Error(`No metadata found for token module.`);
	}

	return [interoperabilityMetadata, tokenMetadata];
};

type KVStore = db.Database;
const DB_KEY_EVENTS = Buffer.from([1]);

const getDBInstance = async (dataPath: string, dbName = 'events.db'): Promise<KVStore> => {
	const dirPath = join(dataPath.replace('~', os.homedir()), 'plugins/data', dbName);
	console.log(`dirPath: ${dirPath}`);

	await ensureDir(dirPath);
	return new db.Database(dirPath);
};

const ccmsInfoSchema = {
	$id: 'msgRecoveryPlugin/ccmsFromEvents',
	type: 'object',
	properties: {
		ccms: {
			type: 'array',
			fieldNumber: 1,
			items: {
				...ccmSchema,
			},
		},
	},
};

interface CCMsInfo {
	ccms: CCMsg[];
}

class EventsModel {
	private readonly _db: KVStore;

	public constructor(db: KVStore) {
		this._db = db;
	}

	public async close() {
		await this._db.close();
	}

	public async getCCMs(): Promise<CCMsg[]> {
		let ccms: CCMsg[] = [];
		try {
			const encodedInfo = await this._db.get(DB_KEY_EVENTS);
			ccms = codec.decode<CCMsInfo>(ccmsInfoSchema, encodedInfo).ccms;
		} catch (error) {
			checkDBError(error);
		}
		return ccms;
	}

	public async setCCMs(ccms: CCMsg[]) {
		const encodedInfo = codec.encode(ccmsInfoSchema, { ccms });
		await this._db.set(DB_KEY_EVENTS, encodedInfo);
	}
}

// It should be run after all nodes have started
// Then we need to run `ts-node pos-mainchain-fast/config/scripts/sidechain_registration.ts` (note the change: const SIDECHAIN_ARRAY = ['one'])
// & then ts-node pos-sidechain-example-one/config/scripts/mainchain_registration.ts (```one```)
(async () => {
	const mainchainClient = await apiClient.createIPCClient(`~/.lisk/mainchain-node-one`);
	const mainchainNodeInfo = await mainchainClient.invoke('system_getNodeInfo');

	const eventsDb = await getDBInstance('~/.lisk');
	const eventsModel = new EventsModel(eventsDb);

	mainchainClient.subscribe('chain_newBlock', async (data?: Record<string, unknown>) => {
		const { blockHeader: receivedBlock } = data as unknown as Data;
		const newBlockHeader = chain.BlockHeader.fromJSON(receivedBlock).toObject();
		console.log(
			`Received new block ${newBlockHeader.height} on mainchain ${mainchainNodeInfo.chainID}`,
		);

		const allCCMs = await eventsModel.getCCMs();
		console.log('allCCMs.length: ', allCCMs.length);
		console.log('allCCMs => ', allCCMs);

		// Check for events if any and store them
		const blockEvents = await mainchainClient.invoke<JSONObject<chain.EventAttr[]>>(
			'chain_getEvents',
			{ height: newBlockHeader.height },
		);
		// console.log('blockEvents => ', blockEvents);

		const ccmsFromEvents: CCMsg[] = [];
		const interopMetadata = (await getInteropAndTokenModulesMetadata(mainchainClient))[0];
		// console.log(interopMetadata);

		/* const parseCcmSentFailedEvents = async () => {
			const ccmSentFailedEvents = blockEvents.filter(
				eventAttr =>
					eventAttr.module === MODULE_NAME_INTEROPERABILITY && eventAttr.name === 'ccmSentFailed',
			);
			if (ccmSentFailedEvents.length > 0) {
				console.log('ccmSentFailedEvents', ccmSentFailedEvents);

				// ccmSentFailedEventInfo
				const ccmSentFailedEventInfo = interopMetadata.events.filter(
					event => event.name === 'ccmSentFailed',
				);
				if (!ccmSentFailedEventInfo?.[0]?.data) {
					throw new Error('No schema found for "ccmSentFailed" event data.');
				}

				for (const ccmSentFailedEvent of ccmSentFailedEvents) {
					const ccmSentFailedEventData = codec.decode<CcmSentFailedEventData>(
						ccmSentFailedEventInfo[0].data,
						Buffer.from(ccmSentFailedEvent.data, 'hex'),
					);
					console.log('ccmSentFailedEventData => ', ccmSentFailedEventData);

					// Do we need to filter based on `ccm.sendingChainID = mainchain ?
					const ccm = ccmSentFailedEventData.ccm;
					if (ccm.sendingChainID.equals(Buffer.from('04000000', 'hex'))) {
						ccmsFromEvents.push(ccm);
					}
				}
			}
		}; */

		const getEventsByName = (name: string) => {
			return blockEvents.filter(
				eventAttr => eventAttr.module === MODULE_NAME_INTEROPERABILITY && eventAttr.name === name,
			);
		};

		const getEventData = (name: string): Schema => {
			const eventInfo = interopMetadata.events.filter(event => event.name === name);
			if (!eventInfo?.[0]?.data) {
				throw new Error(`No schema found for ${name} event data.`);
			}
			return eventInfo?.[0]?.data;
		};

		const parseCcmSendSuccessEvents = () => {
			const eventsByName = getEventsByName('ccmSendSuccess');
			if (eventsByName) {
				const data = getEventData('ccmSendSuccess');
				for (const ccmSentSuccessEvent of eventsByName) {
					const ccmSendSuccessEventData = codec.decode<CcmSendSuccessEventData>(
						data,
						Buffer.from(ccmSentSuccessEvent.data, 'hex'),
					);
					console.log('ccmSendSuccessEventData => ', ccmSendSuccessEventData);

					// Do we need to filter based on `ccm.sendingChainID = mainchain ?
					const ccm = ccmSendSuccessEventData.ccm;
					if (ccm.sendingChainID.equals(Buffer.from('04000000', 'hex'))) {
						ccmsFromEvents.push(ccm);
						console.log('ccmsFromEvents.length:::::::::::::::: ', ccmsFromEvents.length);
					}
				}
			}
		};

		const parseCcmProcessedEvents = () => {
			const eventsByName = getEventsByName(EVENT_NAME_CCM_PROCESSED);
			if (eventsByName) {
				const data = getEventData(EVENT_NAME_CCM_PROCESSED);
				for (const ccmProcessedEvent of eventsByName) {
					const ccmProcessedEventData = codec.decode<CcmProcessedEventData>(
						data,
						Buffer.from(ccmProcessedEvent.data, 'hex'),
					);
					console.log('ccmProcessedEventData => ', ccmProcessedEventData);

					// Do we need to filter based on `ccm.sendingChainID = mainchain ?
					const ccm = ccmProcessedEventData.ccm;
					if (ccm.sendingChainID.equals(Buffer.from('04000000', 'hex'))) {
						ccmsFromEvents.push(ccm);
					}
				}
			}
		};

		// await parseCcmSentFailedEvents();
		await parseCcmSendSuccessEvents();
		await parseCcmProcessedEvents();

		for (const ccmFromEvent of ccmsFromEvents) {
			allCCMs.push(ccmFromEvent);
		}
		console.log('allCCMs.length(AFTER push): ', allCCMs.length);
		// console.log("allCCMs(AFTER push) => ", allCCMs);

		await eventsModel.setCCMs(allCCMs);
	});
})();
