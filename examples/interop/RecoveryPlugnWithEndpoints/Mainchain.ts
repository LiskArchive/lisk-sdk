import { apiClient, db, Transaction, cryptography } from 'lisk-sdk';
import { RecoveryPluginConfig } from './types';
import { toBlockHeader, buildMessageRecoveryQueryKey, buildStateRecoveryQueryKey } from './utils';

import { MessageRecoveryDb } from './db/MessageRecoveryDb';
import { StateRecoveryDB } from './db/StateRecoveryDb';
import { MessageRecoveryHelper } from './MessageRecoveryHelper';
import { CCMsg } from 'lisk-framework';
import { parseCCMs } from './events';
import { StateRecoveryHelper } from './stateRecoveryHelper';
import { Sidechain } from './Sidechain';

export class Mainchain {
	private _config!: RecoveryPluginConfig;

	private _client!: apiClient.APIClient;
	private _nodeInfo!: Record<string, any>;

	private _privateKey!: Buffer;
	public publicKey!: Buffer;
	private _lastCertifiedHeight = -1;

	private _messageRecoveryDb!: MessageRecoveryDb;
	private _stateRecoveryDb!: StateRecoveryDB;

	public async init(
		config: RecoveryPluginConfig,
		messageRecoveryDb: MessageRecoveryDb,
		stateRecoveryDb: StateRecoveryDB,
	): Promise<void> {
		this._config = config;

		this._client = await apiClient.createIPCClient(config.mainchainIPCPath as string);
		this._nodeInfo = await this._client.invoke('system_getNodeInfo');

		this._messageRecoveryDb = messageRecoveryDb;
		this._stateRecoveryDb = stateRecoveryDb;

		await this._parsePrivateKey();
		await this.parseEventsFromNewBlock();
	}

	async parseEventsFromNewBlock() {
		this._client.subscribe('chain_newBlock', async (data?: Record<string, unknown>) => {
			const newBlockHeader = toBlockHeader(data);

			await parseCCMs(newBlockHeader, this._client);
		});
	}

	/**
	 * https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#message-recovery-from-the-sidechain-channel-outbox
	 * ```This means that the message recovery mechanism would only work on the mainchain.```
	 */
	async handleFlowForMessageRecovery(ccms: CCMsg[], sidechain: Sidechain): Promise<string> {
		this._lastCertifiedHeight = (await sidechain.getChainAccount()).lastCertificate.height; // used later for cleanup

		const inclusionProofAtLastCertifiedHeight = await this._messageRecoveryDb.getByHeight(
			this._lastCertifiedHeight,
		);
		if (!inclusionProofAtLastCertifiedHeight) {
			throw new Error(
				'[inclusionProofAtLastCertifiedHeight] TODO: Fix this case, really need to throw error? Can continue? ',
			);
		}

		const { inclusionProof } = inclusionProofAtLastCertifiedHeight;
		const verified = await new db.SparseMerkleTree().verify(
			inclusionProofAtLastCertifiedHeight.stateRoot,
			[buildMessageRecoveryQueryKey(this.getChainID())],
			{
				siblingHashes: inclusionProof.siblingHashes,
				queries: [
					{
						bitmap: inclusionProof.bitmap,
						key: inclusionProof.key,
						value: inclusionProof.value,
					},
				],
			},
		);

		if (!verified) {
			throw new Error(
				'[db.SparseMerkleTree().verify] TODO: Fix this case, really need to throw error? Can continue? if continue, for how long ? what would be end result in that case ?',
			);
		}

		const messageRecoveryHelper = new MessageRecoveryHelper(
			this,
			sidechain,
			this.publicKey,
			this._config.fee,
		);

		// this should initiate terminatedOutbox account for sidechain
		await this.sendTransaction(
			await messageRecoveryHelper.initializeMessageRecoveryTransaction(
				inclusionProofAtLastCertifiedHeight,
			),
		);

		// check/verify if sidechain terminated outbox account initialized
		const initialized = await sidechain.isTerminatedOutboxAccountInitialized();
		if (!initialized) {
			throw new Error('Terminated outbox account must be initialized for sidechain.');
		}

		return await this.sendTransaction(
			await messageRecoveryHelper.createRecoverMessageTransaction(ccms),
		);
	}

	async handleFlowForStateRecovery(sidechain: Sidechain, storeKey: Buffer): Promise<string> {
		const sidechainAccountJSON = await sidechain.getChainAccount();
		this._lastCertifiedHeight = sidechainAccountJSON.lastCertificate.height; // used later for cleanup

		const stateRecoveryHelper = new StateRecoveryHelper();

		await this.sendTransaction(
			await stateRecoveryHelper.initializeStateRecoveryTransaction(sidechainAccountJSON),
		);

		// check/verify if terminated state account initialized
		const terminatedStateAccount = await sidechain.hasTerminatedStateAccount();
		if (!terminatedStateAccount) {
			throw new Error('Terminated state account must be initialized for sidechain.');
		}

		const siblingHashesAfterLastCertificate = await this._stateRecoveryDb.getByHeight(
			this._lastCertifiedHeight,
		);
		if (!siblingHashesAfterLastCertificate) {
			throw new Error(`No siblingHash exists at given height: ${this._lastCertifiedHeight}`);
		}
		const inclusionProof = siblingHashesAfterLastCertificate.inclusionProof;

		// const storeKey = Buffer.concat([sidechain.getSidechainBinaryAddress(), LSK_TOKEN_ID]);
		const queryKey = buildStateRecoveryQueryKey(storeKey);

		const smt = new db.SparseMerkleTree();
		const verified = await smt.verify(siblingHashesAfterLastCertificate.stateRoot, [queryKey], {
			siblingHashes: inclusionProof.siblingHashes,
			queries: [
				{
					bitmap: inclusionProof.bitmap,
					key: inclusionProof.key,
					value: inclusionProof.value,
				},
			],
		});

		// TODO: if (!verified) throw error OR continue ???
		if (!verified) {
			throw new Error('blah');
		}

		return await this.sendTransaction(
			await stateRecoveryHelper.createStateRecoveryTransaction(
				siblingHashesAfterLastCertificate,
				sidechain,
				this,
			),
		);
	}

	private async _parsePrivateKey() {
		const { password, encryptedPrivateKey } = this._config;
		if (!password) {
			throw new Error('Password must be provided from config to decrypt private key.');
		}
		if (!encryptedPrivateKey) {
			throw new Error('Private key must be provided from config.');
		}
		const parsedEncryptedKey = cryptography.encrypt.parseEncryptedMessage(
			encryptedPrivateKey as string,
		);

		// needed for signing tx
		this._privateKey = Buffer.from(
			await cryptography.encrypt.decryptMessageWithPassword(
				parsedEncryptedKey,
				password as string,
				'utf-8',
			),
			'hex',
		);

		this.publicKey = cryptography.ed.getPublicKeyFromPrivateKey(this._privateKey);
	}

	getChainID(): string {
		return this._nodeInfo.chainID;
	}

	async getNonce() {
		const authAccount = await this._client.invoke<{ nonce: string }>('auth_getAuthAccount', {
			address: cryptography.address.getLisk32AddressFromPublicKey(this.publicKey),
		});
		return authAccount.nonce;
	}

	async sendTransaction(tx: Transaction): Promise<string> {
		tx.sign(Buffer.from(this.getChainID(), 'hex'), this._privateKey);

		const response = await this._client.invoke<{
			transactionId: string;
		}>('txpool_postTransaction', {
			transaction: tx.getBytes().toString('hex'),
		});

		return response.transactionId;
	}

	public async disconnect() {
		await this._client.disconnect();

		await this._messageRecoveryDb.deleteUntilHeight(this._lastCertifiedHeight);
		await this._stateRecoveryDb.deleteUntilHeight(this._lastCertifiedHeight);
	}
}
