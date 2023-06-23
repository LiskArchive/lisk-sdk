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

import { join } from 'path';
import { ensureDir } from 'fs-extra';
import { checkDBError } from '@liskhq/lisk-framework-chain-connector-plugin/dist-node/db';
import { MerkleTree } from '@liskhq/lisk-tree';
import { utils } from '@liskhq/lisk-cryptography';
import * as os from 'os';
import { ccmsInfoSchema } from './schema';

export const relayerKeyInfo = {
	address: 'lsk952ztknjoa3h58es4vgu5ovnoscv3amo7zg4zz',
	keyPath: "m/44'/134'/3'",
	publicKey: '8960f85f7ab3cc473f29c3a00e6ad66c569f2a84125388274a4f382e11306099',
	privateKey:
		'a16702175f750eab29ba286a1e30c86eb6057b2aa8547925a1139341d50ee16c8960f85f7ab3cc473f29c3a00e6ad66c569f2a84125388274a4f382e11306099',
	plain: {
		generatorKeyPath: "m/25519'/134'/0'/3'",
		generatorKey: '60df111d5d97bf45c426d889673a8f04499ba312480b1d913fc49c5a77908b83',
		generatorPrivateKey:
			'b623e9d77567fee9c7ea6502275c19849cf5ded916aa5c967835144d5f1295d560df111d5d97bf45c426d889673a8f04499ba312480b1d913fc49c5a77908b83',
		blsKeyPath: 'm/12381/134/0/3',
		blsKey:
			'99b210271475977210d5e92c02e325f011706c5c9fc3861ecfdb8163e078ed1214e8710669e1625b30899c624305bd0e',
		blsProofOfPossession:
			'a4486989094ac9225362084642072777ff0a028d89cc735908ad267be53827821093e34f960857140882e2b062f1a02e193ce9f2ad765268ed82fe462e4755dd378d8edf220d1395c9687a3c88f1fc48a5990ebb43585516e18d7228f0b8b9fd',
		blsPrivateKey: '3d34f3e44a5ce6b2a3c7b79be6ab76ece0fa46749cf66c41e4d000c6ae3353b6',
	},
	encrypted: {},
};

interface CCMsInfo {
	ccms: CCMsg[];
}

export interface Proof {
	readonly siblingHashes: ReadonlyArray<Buffer>;
	readonly idxs: ReadonlyArray<number>;
	readonly size: number;
}

/**
 * Sequence of steps. Also, some steps are mentioned in `initializeMessageRecovery.ts`
 *
 * pm2 stop all
 * rm -rf ~/.lisk
 * ./start_nodes
 * ts-node ./messageRecovery/events/parse_events.ts (start parsing events)
 *
 * --------------------
 *
 * Make sure ```exports.LIVENESS_LIMIT = 2592000;``` in ```lisk-framework/dist-node/modules/interoperability/constants.js```
 * ts-node pos-mainchain-fast/config/scripts/sidechain_registration.ts  (Register sidechain (keep chain connector ON))
 * ts-node pos-sidechain-example-one/config/scripts/mainchain_registration.ts
 *
 *
 * Wait till nodes status change to ACTIVE (as initially they are in REGISTERED status)(check `interoperability_getChainAccount` endpoint)
 *
 * Start saving inclusion proofs
 * - ts-node ./messageRecovery/initializeMessageRecovery.ts (in new console tab/window)
 *
 * Change constant in ```exports.LIVENESS_LIMIT = 30;``` in ```/lisk-sdk/examples/interop/pos-mainchain-fast/node_modules/lisk-framework/dist-node/modules/interoperability/constants.js```
 * Wait for at least 30 sec
 *
 * ------------------
 *
 * - Turn OFF chain connector plugin on mainchain
 * - Make crossChainTransfer on mainchain to sidechain
 * - Make the sidechain terminate on mainchain (because of Liveness)
 * - Submit Liveness termination transaction on mainchain
 *
 * Now you are ready to recover.
 * By this time you should have below CCMs with idx in sidechain(outbox) on mainchain,
 *
 * 0. registrationCCM
 * 1. crossChainTransferCCM
 * 2. terminationCCM
 *
 * You can now try to recover 1. crossChainTransferCCM (where the balance should return to the sender)
 */

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

	const transferCrossChainCCM = ccms.filter(
		ccm => ccm.crossChainCommand === 'transferCrossChain',
	)[0];
	console.log('Pending token transfer CCM to recover: ', transferCrossChainCCM);

	await merkleTree.init(ccms.map(ccm => toBytes(ccm)));
	console.log('merkleTree.root: ', merkleTree.root);

	const queryHash = utils.hash(
		Buffer.concat(
			[LEAF_PREFIX, toBytes(transferCrossChainCCM)],
			LEAF_PREFIX.length + toBytes(transferCrossChainCCM).length,
		),
	);

	const queryHashes = [queryHash];
	console.log('queryHashes: ', queryHashes);

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
		crossChainMessages: [toBytes(transferCrossChainCCM)],
		idxs: proof.idxs as number[],
		siblingHashes: proof.siblingHashes as Buffer[],
	};

	// PRE-REQUISITE: examples/interop/pos-mainchain-fast/config/scripts/transfer_lsk_sidechain_one.ts
	// Final transaction to be submitted

	// In case of recovery, it will simply swap sending/receiving chains & run each CCM in input crossChainMessages[] again
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

	console.log('Final transaction to be posted to tx_pool: ', tx.getBytes().toString('hex'));
	process.exit(0);
})();
