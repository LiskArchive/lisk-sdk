import { BasePluginEndpoint } from 'lisk-sdk';
import { RecoveryPluginConfig } from './types';
import { Mainchain } from './Mainchain';
import { Sidechain } from './Sidechain';
import { CCMsg } from 'lisk-framework';
import { getDBInstance } from './db/db';
import { EventsDb } from './db/EventsDb';
import { MessageRecoveryDb } from './db/MessageRecoveryDb';
import { StateRecoveryDB } from './db/StateRecoveryDb';

interface SidechainWithStoreKey {
	sidechain: Sidechain;
	storeKeys: string[];
}

export class Endpoint extends BasePluginEndpoint {
	private _config!: RecoveryPluginConfig;

	private _messageRecoveryDb!: MessageRecoveryDb;
	private _stateRecoveryDb!: StateRecoveryDB;

	private _mainchain!: Mainchain;
	// private _sidechains: Map<string, Sidechain> = new Map();
	// private _sidechainsWithStoreKeys: Map<string, SidechainWithStoreKey> = new Map();
	private _sidechainsWithStoreKeys: Map<string, SidechainWithStoreKey> = new Map();

	public load(
		config: RecoveryPluginConfig,
		mainchain: Mainchain,
		messageRecoveryDb: MessageRecoveryDb,
		stateRecoveryDb: StateRecoveryDB,
	) {
		this._config = config;
		this._mainchain = mainchain;
		this._messageRecoveryDb = messageRecoveryDb;
		this._stateRecoveryDb = stateRecoveryDb;
	}

	/**
	 * `chainID` MUST correspond to generated sidechain object's `this._nodeInfo.chainID` (otherwise there will be a conflict & can potentially introduce a bug`
	 * `wsUrl` is needed in case of remote sidechain, since IPCPath only works on local machine
	 */
	public async addChainForMessageRecovery(chainID: string, wsUrl: string): Promise<void> {
		await this._configureSidechain(chainID, wsUrl, null);

		const sidechain = (this._sidechainsWithStoreKeys.get(chainID) as SidechainWithStoreKey)
			.sidechain;
		await sidechain.saveProofsForMessageRecovery(this._mainchain.getChainID());
	}

	public async getPendingCCMs(chainID: Buffer): Promise<CCMsg[]> {
		const eventsDb = new EventsDb(await getDBInstance());
		return await eventsDb.getCCMsForChainID(chainID);
	}

	public async triggerMessageRecovery(chainID: string, ccms: CCMsg[]): Promise<string> {
		const sidechain = this._getSidechain(chainID);
		if (!sidechain) {
			throw new Error('No chain was added for message recovery.');
		}

		try {
			// return await (new MessageRecovery(this._mainchain, sidechain)).handleFlow(ccms); // returns generated txID
			return await this._mainchain.handleFlowForMessageRecovery(ccms, sidechain);
		} catch (err) {
			return (err as Error).toString();
		}
	}

	public async addChainForStateRecovery(
		chainID: string,
		wsUrl: string,
		storeKey: string,
	): Promise<void> {
		await this._configureSidechain(chainID, wsUrl, storeKey);

		const sidechain = this._getSidechain(chainID);
		await sidechain.saveProofsForStateRecovery(Buffer.from(storeKey, 'hex'));
	}

	public async triggerStateRecovery(chainID: string, storeKey: string): Promise<string> {
		try {
			const sidechain = this._getSidechain(chainID);
			const storeKeys = (this._sidechainsWithStoreKeys.get(chainID) as SidechainWithStoreKey)
				.storeKeys;
			if (!storeKeys.includes(storeKey)) {
				throw new Error('No such storeKey was previously provided for state recovery.');
			}
			// return await (new MessageRecovery(this._mainchain, sidechain)).handleFlow(ccms); // returns generated txID
			return await this._mainchain.handleFlowForStateRecovery(
				sidechain,
				Buffer.from(storeKey, 'hex'),
			);
		} catch (err) {
			return (err as Error).toString();
		}
	}

	private _getSidechain(chainID: string): Sidechain {
		const sidechainWithStoreKey = this._sidechainsWithStoreKeys.get(chainID);
		if (!sidechainWithStoreKey) {
			throw new Error('No sidechain was configured for recovery.');
		}
		return sidechainWithStoreKey.sidechain;
	}

	// TODO: handle the case when input `chainID` & generated sidechain object's `chainID` don't match with each other.
	private async _configureSidechain(
		chainID: string,
		wsUrl: string,
		storeKey: string | null,
	): Promise<void> {
		if (!this._sidechainsWithStoreKeys.has(chainID)) {
			const sidechain = new Sidechain();
			await sidechain.init(this._config, wsUrl, this._messageRecoveryDb, this._stateRecoveryDb);

			if (chainID !== sidechain.getChainID()) {
				throw new Error("Input chainID doesn't correspond to it's live sidechain.");
			}

			this._sidechainsWithStoreKeys.set(chainID, { sidechain, storeKeys: [] });
		}

		const sidechainWithStoreKey = this._sidechainsWithStoreKeys.get(
			chainID,
		) as SidechainWithStoreKey;
		// Handle the case when same key was provided multiple times
		if (storeKey && !sidechainWithStoreKey.storeKeys.includes(storeKey)) {
			sidechainWithStoreKey.storeKeys.push(storeKey);
		}
	}

	// TODO: To facilitate user, can have an endpoint like this ?
	/**
	 * For ex, token module state for a user (MODULE_PREFIX+SUBSTORE_PREFIX+(Address+tokenID)).
	 *
	 * Idea: We can also create an endpoint to generate queryKey for them where they can specify module and substore key
	 * I think as of now it's related to state recovery only
	 */
	/* buildStateRecoveryQueryKey(sidechainPublicKey: string, _module: string, _subStore: string) {
		const sidechainBinaryAddress = cryptography.address.getAddressFromPublicKey(
			Buffer.from(sidechainPublicKey, 'hex'),
		);
		const storeKey = Buffer.concat([sidechainBinaryAddress, LSK_TOKEN_ID]);
		// TODO: use `module` & `subStore` params to build a stateRecoveryQueryKey similar to the function `buildStateRecoveryQueryKey()`
		return buildStateRecoveryQueryKey(storeKey);
	} */

	// TODO: call this on plugin unload
	unload() {
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach
		this._sidechainsWithStoreKeys.forEach(async (sidechainWithStoreKey: SidechainWithStoreKey) => {
			await sidechainWithStoreKey.sidechain.disconnect();
		});
	}
}
