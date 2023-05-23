import {
	cryptography,
	codec,
	CCMsg,
	ccmSchema,
	apiClient,
	Transaction,
	db,
	MODULE_NAME_INTEROPERABILITY,
	messageRecoveryParamsSchema,
} from 'lisk-sdk';

// to transfer some LSK, we can use this script - examples/interop/pos-mainchain-fast/config/scripts/transfer_lsk_sidechain_one.ts

// elements/lisk-tree/src/merkle_tree/types.ts

import { join } from 'path';
import { ensureDir } from 'fs-extra';
import { checkDBError } from '@liskhq/lisk-framework-chain-connector-plugin/dist-node/db';
import { MerkleTree } from '@liskhq/lisk-tree';
import { utils } from '@liskhq/lisk-cryptography';
import * as os from 'os';
import { relayerKeyInfo } from './includes/relayerKeyInfo';

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

export interface Proof {
	readonly siblingHashes: ReadonlyArray<Buffer>;
	readonly idxs: ReadonlyArray<number>;
	readonly size: number;
}

(async () => {
	const mainchainClient = await apiClient.createIPCClient(`~/.lisk/mainchain-node-one`);
	const mainchainNodeInfo = await mainchainClient.invoke('system_getNodeInfo');

	const sidechainClient = await apiClient.createIPCClient(`~/.lisk/pos-sidechain-example-one`);
	const sidechainNodeInfo = await sidechainClient.invoke('system_getNodeInfo');

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#message-recovery-from-the-sidechain-channel-outbox
	// TODO: The proof of inclusion for the pending CCMs into the outboxRoot property of the terminated outbox account has to be available.

	/**
	 * // LIP 54
	 * ```
	 * Notice that the message recovery mechanism requires that the channel outbox is stored in the chain where the commands are processed.
	 * In the SDK 6, sidechain channels can only be stored on the mainchain. This means that the message recovery mechanism
	 * would only work on the mainchain.
	 */

	// This mechanism allows to recover any CCM pending in the sidechain channel outbox.
	// sidechain channel is stored on mainchain (during sidechain registration process - LIP 43)

	// All cross-chain messages must have the correct format, which is checked by the following logic:
	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#validateformat

	// ``` The pending CCMs to be recovered have to be available to the sender of the recovery command. ```
	// Before preparing this array, it's worth to check Verification section of `Message Recovery Command`
	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#verification-1

	type KVStore = db.Database;
	const DB_KEY_EVENTS = Buffer.from([1]);

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
	}

	const getDBInstance = async (dataPath: string, dbName = 'events.db'): Promise<KVStore> => {
		const dirPath = join(dataPath.replace('~', os.homedir()), 'plugins/data', dbName);
		console.log(`dirPath: ${dirPath}`);

		await ensureDir(dirPath);
		return new db.Database(dirPath);
	};

	const toBytes = (ccm: CCMsg) => codec.encode(ccmSchema, ccm);

	const LEAF_PREFIX = Buffer.from('00', 'hex');
	const eventsModel = new EventsModel(await getDBInstance('~/.lisk'));
	const merkleTree = new MerkleTree();

	const ccms = await eventsModel.getCCMs();
	console.log(ccms);

	const transferCrossChainCcm = ccms.filter(
		ccm => ccm.crossChainCommand === 'transferCrossChain',
	)[0];
	console.log('Pending token transfer CCM to recover: ', transferCrossChainCcm);

	await merkleTree.init(ccms.map(ccm => toBytes(ccm)));
	console.log('merkleTree.root: ', merkleTree.root);

	const queryHash = utils.hash(
		Buffer.concat(
			[LEAF_PREFIX, toBytes(transferCrossChainCcm)],
			LEAF_PREFIX.length + toBytes(transferCrossChainCcm).length,
		),
	);

	const queryHashes = [queryHash];
	console.log('queryHashes: ', queryHashes);

	/* const witness = await merkleTree.generateRightWitness(2);
	console.log("witness: ", witness); */

	const proof = await merkleTree.generateProof(queryHashes);
	console.log('merkleTree: ', merkleTree);
	console.log('merkleTree.generateProof: ', proof);

	interface MessageRecoveryParams {
		chainID: Buffer;
		crossChainMessages: Buffer[];
		idxs: number[];
		siblingHashes: Buffer[];
	}

	const messageRecoveryParams: MessageRecoveryParams = {
		chainID: sidechainNodeInfo.chainID as Buffer,
		crossChainMessages: [toBytes(transferCrossChainCcm)],
		idxs: proof.idxs as number[],
		siblingHashes: proof.siblingHashes as Buffer[],
	};

	// PRE-REQUISITE: examples/interop/pos-mainchain-fast/config/scripts/transfer_lsk_sidechain_one.ts
	// Final transaction to be submitted

	// in case of recovery, it will simply swap sending/receiving chains & run each CCM in input crossChainMessages[] again
	// LIP 54: ```def applyRecovery(trs: Transaction, ccm: CCM) -> None:```
	const tx = new Transaction({
		module: MODULE_NAME_INTEROPERABILITY,
		// COMMAND_RECOVER_MESSAGE	string	"recoverMessage"	Name of message recovery command. (LIP 45)
		command: 'recoverMessage',
		fee: BigInt(5450000000),
		params: codec.encodeJSON(messageRecoveryParamsSchema, messageRecoveryParams),
		nonce: BigInt(
			(
				await mainchainClient.invoke<{ nonce: string }>('auth_getAuthAccount', {
					address: cryptography.address.getLisk32AddressFromPublicKey(
						Buffer.from(relayerKeyInfo.publicKey, 'hex'),
					),
				})
			).nonce,
		),
		senderPublicKey: Buffer.from(relayerKeyInfo.publicKey, 'hex'),
		signatures: [],
	});

	tx.sign(
		Buffer.from(mainchainNodeInfo.chainID as string, 'hex'),
		Buffer.from(relayerKeyInfo.privateKey, 'hex'),
	);

	console.log(tx.getBytes().toString('hex'));
})();
