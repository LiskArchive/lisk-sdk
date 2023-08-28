import { ChannelDataJSON, apiClient, db, codec, ChainAccountJSON, ChainStatus } from 'lisk-sdk';
import { RecoveryPluginConfig } from './types';
import {
	toChannelData,
	toProveResponse,
	getBalances,
	getStateProveResponseJSON,
	buildMessageRecoveryQueryKey,
	toBlockHeader,
	buildStateRecoveryQueryKey,
} from './utils';

import { userStoreSchema } from 'lisk-framework/dist-node/modules/token/stores/user';
import { TerminatedOutboxAccountJSON } from 'lisk-framework/dist-node/modules/interoperability/stores/terminated_outbox';
import { MessageRecoveryDb } from './db/MessageRecoveryDb';
import { StateRecoveryDB } from './db/StateRecoveryDb';
import { LSK_TOKEN_ID } from './constants';
import { TerminatedStateAccountJSON } from 'lisk-framework/dist-node/modules/interoperability/stores/terminated_state';

export class Sidechain {
	// private _config!: RecoveryPluginConfig;

	private _client!: apiClient.APIClient;
	private _nodeInfo!: Record<string, any>;

	private _messageRecoveryDb!: MessageRecoveryDb;
	private _stateRecoveryDb!: StateRecoveryDB;

	private _senderLSKAddress!: string;

	// `init` is needed, since ```TS1089: 'async' modifier cannot appear on a constructor declaration.```
	public async init(
		_config: RecoveryPluginConfig,
		wsUrl: string,
		messageRecoveryDb: MessageRecoveryDb,
		stateRecoveryDb: StateRecoveryDB,
	): Promise<void> {
		// this._config = config;

		// either IPC or WebSocket (if remote)
		this._client = await apiClient.createWSClient(wsUrl);
		this._nodeInfo = await this._client.invoke('system_getNodeInfo');

		this._messageRecoveryDb = messageRecoveryDb;
		this._stateRecoveryDb = stateRecoveryDb;

		// this._senderLSKAddress = config.senderLSKAddress as string;
	}

	// called from `addChainForMessageRecovery` endpoint
	// examples/interop/messageRecovery/initializeMessageRecovery.ts
	// this could also be a util func with apiClient & messageRecoveryDb as required params
	async saveProofsForMessageRecovery(mainchainID: string): Promise<void> {
		this._client.subscribe('chain_newBlock', async (data?: Record<string, unknown>) => {
			const newBlockHeader = toBlockHeader(data);

			// Returns proof for sidechain lastBlock header stateRoot (which is state root of the last block that was forged)
			const proof = toProveResponse(
				await getStateProveResponseJSON(this._client, buildMessageRecoveryQueryKey(mainchainID)),
			).proof;

			// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0039.md#proof-verification
			// To check the proof, the Verifier calls ```verify(queryKeys, proof, merkleRoot) function```
			const smt = new db.SparseMerkleTree();
			const verified = await smt.verify(newBlockHeader.stateRoot, [proof.queries[0].key], proof);
			if (verified) {
				await this._messageRecoveryDb.save({
					height: newBlockHeader.height,
					stateRoot: newBlockHeader.stateRoot,
					inclusionProof: {
						key: proof.queries[0].key,
						value: proof.queries[0].value,
						bitmap: proof.queries[0].bitmap,
						siblingHashes: proof.siblingHashes,
					},
				});
			}
		});
	}

	// examples/interop/pos-mainchain-fast/config/scripts/recover_lsk_plugin.ts
	// Here `storeKey` is saved in `stateRecoveryDb`
	async saveProofsForStateRecovery(storeKey: Buffer) {
		this._client.subscribe('chain_newBlock', async (data?: Record<string, unknown>) => {
			const newBlockHeader = toBlockHeader(data);

			// 1. Could be possibly removed, since it's retrieved again using the same code on Mainchain
			// 2. There is no such thing as `this._config.sidechainPublicKey` for this  Sidechain class
			// 3. If we meant to rather ```buildStateRecoveryQueryKey```, then yes, everything could be sent from sidechain user
			// const storeKey = Buffer.concat([this.getSidechainBinaryAddress(), LSK_TOKEN_ID]);

			// ```stateProveRequestKey``` can be provided by user ???
			const proof = toProveResponse(
				await getStateProveResponseJSON(this._client, buildStateRecoveryQueryKey(storeKey)), // ???
			).proof;

			const smt = new db.SparseMerkleTree();
			const verified = await smt.verify(newBlockHeader.stateRoot, [proof.queries[0].key], proof);
			if (verified) {
				const inclusionProof = {
					key: proof.queries[0].key,
					value: proof.queries[0].value,
					bitmap: proof.queries[0].bitmap,
					siblingHashes: proof.siblingHashes,
				};

				const userBalance = await getBalances(this._client, this._senderLSKAddress, LSK_TOKEN_ID);
				const storeValue = codec.encode(userStoreSchema, userBalance);

				await this._stateRecoveryDb.save({
					inclusionProof,
					height: newBlockHeader.height,
					stateRoot: newBlockHeader.stateRoot,
					storeKey,
					// since this can be retrieved in the same way on Mainchain, we can skip saving it in DB
					storeValue,
				});
			}
		});
	}

	// TODO: `there is no `this._config.sidechainPublicKey` in case of remote sidechain, find out how to add this public key ???
	// Each sidechain will have it's own public key
	public getSidechainBinaryAddress(): Buffer {
		/* return cryptography.address.getAddressFromPublicKey(
			Buffer.from(this._config.sidechainPublicKey, 'hex'),
		);*/
		return Buffer.from('blah');
	}

	async getChannelData(chainID: string) {
		const channelDataJSON = await this._client.invoke<ChannelDataJSON>(
			'interoperability_getChannel',
			{
				chainID: chainID,
			},
		);
		return toChannelData(channelDataJSON);
	}

	getChainID() {
		return this._nodeInfo.chainID as string;
	}

	async getChainAccount(): Promise<ChainAccountJSON> {
		const sidechainAccountJSON = await this._client.invoke<ChainAccountJSON>(
			'interoperability_getChainAccount',
			{ chainID: this.getChainID() },
		);
		if (sidechainAccountJSON.status !== ChainStatus.TERMINATED) {
			throw new Error('Sidechain is not yet terminated.');
		}
		return sidechainAccountJSON;
	}

	// TODO: Fix/correct this ?
	// what if we send a non-existing chainID ?
	async isTerminatedOutboxAccountInitialized(): Promise<boolean> {
		const account = await this._client.invoke<TerminatedOutboxAccountJSON>(
			'interoperability_getTerminatedOutboxAccount',
			{ chainID: this._nodeInfo },
		);
		return account.outboxSize > 0; // ???
	}

	async hasTerminatedStateAccount(): Promise<boolean> {
		const account = await this._client.invoke<TerminatedStateAccountJSON>(
			'interoperability_getTerminatedStateAccount',
			{ chainID: this._nodeInfo },
		);

		return account.initialized !== false;
	}

	public async disconnect() {
		await this._client.disconnect();
	}
}
