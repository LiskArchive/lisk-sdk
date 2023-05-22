import { HASH_LENGTH } from 'lisk-framework/dist-node/modules/interoperability/constants';
import { TOKEN_ID_LENGTH } from 'lisk-framework/dist-node/modules/token/constants';
import {
	apiClient,
	chain,
	cryptography,
	MODULE_NAME_INTEROPERABILITY,
	messageRecoveryInitializationParamsSchema,
	ChainStatus,
	codec,
	Transaction,
	ChannelDataJSON,
	ChannelData,
	ChainAccountJSON,
	Inbox,
	Outbox,
	db,
	ProveResponse,
	OutboxRootWitness,
	// CCMsg,
} from 'lisk-sdk';
import { join } from 'path';
import { ensureDir } from 'fs-extra';
import * as os from 'os';

// LIP 45
const STORE_PREFIX_INTEROPERABILITY = Buffer.from('83ed0d25', 'hex');
const SUBSTORE_PREFIX_CHANNEL_DATA = Buffer.from('a000', 'hex');

const getDBInstance = async (
	dataPath: string,
	dbName = 'messageRecoveryPlugin.db',
): Promise<KVStore> => {
	const dirPath = join(dataPath.replace('~', os.homedir()), 'plugins/data', dbName);
	console.log(`dirPath: ${dirPath}`);

	await ensureDir(dirPath);
	return new db.Database(dirPath);
};

interface Data {
	readonly blockHeader: chain.BlockHeaderJSON;
}

interface MessageRecoveryInitializationParams {
	chainID: Buffer;
	channel: Buffer;
	bitmap: Buffer;
	siblingHashes: Buffer[];
}

const channelDataJSONToObj = (channelData: ChannelDataJSON): ChannelData => {
	const { inbox, messageFeeTokenID, outbox, partnerChainOutboxRoot, minReturnFeePerByte } =
		channelData;

	const inboxJSON: Inbox = {
		appendPath: inbox.appendPath.map(ap => Buffer.from(ap, 'hex')),
		root: Buffer.from(inbox.root, 'hex'),
		size: inbox.size,
	};

	const outboxJSON: Outbox = {
		appendPath: outbox.appendPath.map(ap => Buffer.from(ap, 'hex')),
		root: Buffer.from(outbox.root, 'hex'),
		size: outbox.size,
	};

	return {
		messageFeeTokenID: Buffer.from(messageFeeTokenID, 'hex'),
		outbox: outboxJSON,
		inbox: inboxJSON,
		partnerChainOutboxRoot: Buffer.from(partnerChainOutboxRoot, 'hex'),
		minReturnFeePerByte: BigInt(minReturnFeePerByte),
	};
};

const proveResponseJSONToObj = (proveResponseJSON: ProveResponseJSON): ProveResponse => {
	const {
		proof: { queries, siblingHashes },
	} = proveResponseJSON;

	return {
		proof: {
			queries: queries.map(query => ({
				bitmap: Buffer.from(query.bitmap, 'hex'),
				key: Buffer.from(query.key, 'hex'),
				value: Buffer.from(query.value, 'hex'),
			})),
			siblingHashes: siblingHashes.map(siblingHash => Buffer.from(siblingHash, 'hex')),
		},
	};
};

const inclusionProofsWithHeightAndStateRootSchema = {
	$id: `scripts/recovery/inclusionProofs`,
	type: 'object',
	properties: {
		inclusionProofs: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					height: { dataType: 'uint32', fieldNumber: 1 },
					inclusionProof: {
						type: 'object',
						fieldNumber: 2,
						properties: {
							siblingHashes: {
								type: 'array',
								fieldNumber: 1,
								items: {
									dataType: 'bytes',
								},
							},
							bitmap: {
								dataType: 'bytes',
								fieldNumber: 2,
							},
							key: {
								dataType: 'bytes',
								fieldNumber: 3,
							},
							value: {
								dataType: 'bytes',
								fieldNumber: 4,
							},
						},
					},
					stateRoot: { dataType: 'bytes', fieldNumber: 3 },
					/* storeValue: { dataType: 'bytes', fieldNumber: 4 },
					storeKey: { dataType: 'bytes', fieldNumber: 5 }, */
				},
			},
		},
	},
};
type ProveResponseJSON = JSONObject<ProveResponse>;

const inboxOutboxProps = {
	appendPath: {
		type: 'array',
		items: {
			dataType: 'bytes',
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
		},
		fieldNumber: 1,
	},
	size: {
		dataType: 'uint32',
		fieldNumber: 2,
	},
	root: {
		dataType: 'bytes',
		minLength: HASH_LENGTH,
		maxLength: HASH_LENGTH,
		fieldNumber: 3,
	},
};

// LIP: https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#cross-chain-message-schema
// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#channel-data-substore
const channelSchema = {
	$id: '/modules/interoperability/channel',
	type: 'object',
	required: [
		'inbox',
		'outbox',
		'partnerChainOutboxRoot',
		'messageFeeTokenID',
		'minReturnFeePerByte',
	],
	properties: {
		inbox: {
			type: 'object',
			fieldNumber: 1,
			required: ['appendPath', 'size', 'root'],
			properties: inboxOutboxProps,
		},
		outbox: {
			type: 'object',
			fieldNumber: 2,
			required: ['appendPath', 'size', 'root'],
			properties: inboxOutboxProps,
		},
		partnerChainOutboxRoot: {
			dataType: 'bytes',
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
			fieldNumber: 3,
		},
		messageFeeTokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 4,
		},
		minReturnFeePerByte: {
			dataType: 'uint64',
			fieldNumber: 5,
		},
	},
};

type Primitive = string | number | bigint | boolean | null | undefined;
type Replaced<T, TReplace, TWith, TKeep = Primitive> = T extends TReplace | TKeep
	? T extends TReplace
		? TWith | Exclude<T, TReplace>
		: T
	: {
			[P in keyof T]: Replaced<T[P], TReplace, TWith, TKeep>;
	  };

type JSONObject<T> = Replaced<T, bigint | Buffer, string>;

interface InclusionProofWithHeightAndStateRoot {
	height: number;
	stateRoot: Buffer;
	inclusionProof: OutboxRootWitness & { key: Buffer; value: Buffer };
}

type KVStore = db.Database;
const DB_KEY_INCLUSION_PROOF = Buffer.from([1]);

class InclusionProofModel {
	private readonly _db: KVStore;

	public constructor(db: KVStore) {
		this._db = db;
	}

	public async close() {
		await this._db.close();
	}

	public async getAll(): Promise<InclusionProofWithHeightAndStateRoot[]> {
		let proofs: InclusionProofWithHeightAndStateRoot[] = [];
		try {
			const encodedInfo = await this._db.get(DB_KEY_INCLUSION_PROOF);
			proofs = codec.decode<{ inclusionProofs: InclusionProofWithHeightAndStateRoot[] }>(
				inclusionProofsWithHeightAndStateRootSchema,
				encodedInfo,
			).inclusionProofs;
		} catch (error) {
			if (!(error instanceof db.NotFoundError)) {
				throw error;
			}
		}
		return proofs;
	}

	public async getByHeight(
		height: number,
	): Promise<InclusionProofWithHeightAndStateRoot | undefined> {
		return (await this.getAll()).find(proof => proof.height === height);
	}

	/**
	 * This will save proofs greater than or equal to given height
	 * @param height Last certified height
	 */
	public async deleteProofsUntilHeight(height: number) {
		const filteredProofs = (await this.getAll()).filter(proofs => proofs.height >= height);

		await this._db.set(
			DB_KEY_INCLUSION_PROOF,
			codec.encode(inclusionProofsWithHeightAndStateRootSchema, {
				inclusionProofs: filteredProofs,
			}),
		);
	}

	public async save(inclusionProofWithHeightAndStateRoot: InclusionProofWithHeightAndStateRoot) {
		const proofs = await this.getAll();
		proofs.push(inclusionProofWithHeightAndStateRoot);

		const encodedInfo = codec.encode(inclusionProofsWithHeightAndStateRootSchema, {
			inclusionProofs: proofs,
		});
		await this._db.set(DB_KEY_INCLUSION_PROOF, encodedInfo);
	}
}

const relayerKeyInfo = {
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

/*
type ModuleMetadata = {
	stores: { key: string; data: Schema }[];
	events: { name: string; data: Schema }[];
	name: string;
};

type ModulesMetadata = [
	ModuleMetadata
];

const getModuleMetadata = async (mainchainClient: apiClient.APIClient) => {
	const { modules: modulesMetadata } = await mainchainClient.invoke<{ modules: ModulesMetadata; }>(
		'system_getMetadata'
	);
	const interoperabilityMetadata = modulesMetadata.find(
		metadata => metadata.name === MODULE_NAME_INTEROPERABILITY,
	);
	if (!interoperabilityMetadata) {
		throw new Error(`No metadata found for ${MODULE_NAME_INTEROPERABILITY} module.`);
	}
	return interoperabilityMetadata;
};
*/

/**
 * Steps:
 * cd examples/interop/
 *
 * make sure `exports.LIVENESS_LIMIT = 2592000;` in `examples/interop/pos-mainchain-fast/node_modules/lisk-framework/dist-node/modules/interoperability/constants.js`
 * ./start_example  (script to configure & register chains)
 *
 * Call `chainConnector_getSentCCUs` to see if any CCU was sent (sidechain status must change to ACTIVE after first CCU)
 *
 * call `interoperability_getChainAccount` endpoint to verify `status`, if it still shows 0, observe logs
 * `pm2 logs 2` (2 is id of pos-sidechain-example-one),
 * Initially, it'll log ``No valid CCU can be generated for the height: X` (e.g. till height 20)
 *
 * run ***this*** script (make sure sidechain status has changed to ACTIVE (on mainchain))
 * ts-node ./messageRecovery/initializeMessageRecovery.ts // it will keep on saving inclusion proofs for sidechain
 * // observe logs to see both mainchain & sidechain are receiving blocks & sidechain is saving inclusion proofs
 * // Make sure `sidechainAccount.lastCertificate.height` is increasing (if not sidechain might already have been terminated)
 *
 * // Now stop ALL nodes
 * pm2 stop all

 * terminate sidechain
 * // Before terminating a sidechain, make sure, `sidechainAccount.lastCertificate.height` (on mainchain) has reached `Successfully stored inclusion proof at height x` (x is the first height on sidechain)
 *
 * pwd
 * /examples/interop/pos-mainchain-fast
 *
 * Change constant in `lisk-framework/dist-node/modules/interoperability/constants.js`
 * // exports.LIVENESS_LIMIT = 2592000;
 * => exports.LIVENESS_LIMIT = 30; // Next wait for 30 seconds
 *
 * pm2 start all
 * // Now `this running` script (from other terminal window) should show logs again
 * while `sidechainAccount.lastCertificate.height` logging SAME value (an indication sidechain has already been terminated)
 *
 * Run `terminateSidechainForLiveness` command  in console (note: `--send` is missing here)
 * cd pos-mainchain-fast
 * ./bin/run transaction:create interoperability terminateSidechainForLiveness  200000000 --json --passphrase="two thunder nurse process feel fence addict size broccoli swing city speed build slide virus ridge jazz mushroom road fish border argue weapon lens" --key-derivation-path="m/44'/134'/1'" --data-path ~/.lisk/mainchain-node-one
 *  Please enter: chainID:  04000001   (taken from examples/interop/README.md)
 *
 * 3. Call `txpool_postTransaction` to `http://127.0.0.1:7881/rpc` with generated transaction
 * // Here `7881` is port of mainchain-node-one
 */

(async () => {
	console.log('Starting message recovery plugin...');

	let inclusionProofModel: InclusionProofModel;
	try {
		inclusionProofModel = new InclusionProofModel(await getDBInstance('~/.lisk'));
		// console.log('DB is initialized.');
	} catch (error) {
		console.log('Error occurred while initializing DB', error);
		process.exit();
	}

	const mainchainClient = await apiClient.createIPCClient(`~/.lisk/mainchain-node-one`);
	const sidechainClient = await apiClient.createIPCClient(`~/.lisk/pos-sidechain-example-one`);

	const mainchainNodeInfo = await mainchainClient.invoke('system_getNodeInfo');
	const sidechainNodeInfo = await sidechainClient.invoke('system_getNodeInfo');

	const recoveryKey = Buffer.concat([
		STORE_PREFIX_INTEROPERABILITY,
		SUBSTORE_PREFIX_CHANNEL_DATA,
		cryptography.utils.hash(Buffer.from(mainchainNodeInfo.chainID as string, 'hex')),
	]);
	// console.log('recoveryKey: ', recoveryKey);

	// Collect inclusion proofs on sidechain and save it in recoveryDB
	sidechainClient.subscribe('chain_newBlock', async (data?: Record<string, unknown>) => {
		const { blockHeader: receivedBlock } = data as unknown as Data;
		const newBlockHeader = chain.BlockHeader.fromJSON(receivedBlock).toObject();
		console.log(
			`Received new block ${newBlockHeader.height} on sidechain ${sidechainNodeInfo.chainID}`,
		);

		// await printEvents(newBlockHeader as BlockHeader, 'sidechain Events => ');

		// Returns proof for sidechain lastBlock header stateRoot (which is state root of the last block that was forged)
		const proof = proveResponseJSONToObj(
			await sidechainClient.invoke<ProveResponseJSON>('state_prove', {
				queryKeys: [recoveryKey.toString('hex')], // `queryKey` is `string`
			}),
		).proof;
		// console.log('proof: ', proof);

		// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0039.md#proof-verification
		// To check the proof, the Verifier calls ```verify(queryKeys, proof, merkleRoot) function```
		// const smt = new db.SparseMerkleTree();
		// console.log('smt.verify: ', await smt.verify(newBlockHeader.stateRoot, [proof.queries[0].key], proof));

		const inclusionProof = {
			key: proof.queries[0].key,
			value: proof.queries[0].value,
			bitmap: proof.queries[0].bitmap,
			siblingHashes: proof.siblingHashes,
		};

		const inclusionProofWithHeightAndStateRoot = {
			height: newBlockHeader.height,
			stateRoot: newBlockHeader.stateRoot,
			inclusionProof,
		};

		await inclusionProofModel.save(inclusionProofWithHeightAndStateRoot);
		console.log(`Successfully stored inclusion proof at height ${newBlockHeader.height}`);
	});

	// saves CCMs from new block events
	/* const saveDataOnNewBlock = async (newBlockHeader: BlockHeader) => {

		// const interoperabilityMetadata = await getModuleMetadata(mainchainClient);

		// Check for events if any and store them
		const events = await mainchainClient.invoke<JSONObject<chain.EventAttr[]>>(
			'chain_getEvents',
			{ height: newBlockHeader.height },
		);
		console.log(events);

		// const ccmsFromEvents = [];

		// eslint-disable-next-line no-restricted-syntax, no-labels
		// ccmInEventsCheck: if (events && events.length > 0) {


			/!* const ccmSendSuccessEvents = events.filter(
				eventAttr =>
					eventAttr.name === CCM_SEND_SUCCESS && eventAttr.module === MODULE_NAME_INTEROPERABILITY,
			);

			const ccmProcessedEvents = events.filter(
				eventAttr =>
					eventAttr.name === CCM_PROCESSED && eventAttr.module === MODULE_NAME_INTEROPERABILITY,
			);

			if (ccmSendSuccessEvents.length === 0 && ccmProcessedEvents.length === 0) {
				// If there are no CCMs present in the events for the height then skip CCM saving part
				// eslint-disable-next-line no-labels
				break ccmInEventsCheck;
			} *!/

			// Save ccm send success events
			/!* if (ccmSendSuccessEvents.length > 0) {
				const ccmSendSuccessEventInfo = interoperabilityMetadata.events.filter(
					event => event.name === CCM_SEND_SUCCESS,
				);
				if (!ccmSendSuccessEventInfo?.[0]?.data) {
					throw new Error('No schema found for "ccmSendSuccess" event data.');
				}

				for (const ccmSendSuccessEvent of ccmSendSuccessEvents) {
					const eventData = codec.decode<CcmSendSuccessEventData>(
						ccmSendSuccessEventInfo[0].data,
						Buffer.from(ccmSendSuccessEvent.data, 'hex'),
					);
					ccmsFromEvents.push(eventData.ccm);
				}
			} *!/

			// Save ccm processed events based on CCMProcessedResult FORWARDED = 1
			/!* if (ccmProcessedEvents.length > 0) {
				const ccmProcessedEventInfo = interoperabilityMetadata.events.filter(
					event => event.name === CCM_PROCESSED,
				);

				if (!ccmProcessedEventInfo?.[0]?.data) {
					throw new Error('No schema found for "ccmProcessed" event data.');
				}

				for (const ccmProcessedEvent of ccmProcessedEvents) {
					const eventData = codec.decode<CcmProcessedEventData>(
						ccmProcessedEventInfo[0].data,
						Buffer.from(ccmProcessedEvent.data, 'hex'),
					);
					if (eventData.result === CCMProcessedResult.FORWARDED) {
						ccmsFromEvents.push(eventData.ccm);
					}
				}
			} *!/
		// }

		/!*
		const crossChainMessages = await this._chainConnectorStore.getCrossChainMessages();
		crossChainMessages.push({
			ccms: this._isReceivingChainMainchain
				? ccmsFromEvents
				: ccmsFromEvents.filter(ccm => ccm.receivingChainID.equals(this._receivingChainID)),
			height: newBlockHeader.height,
			inclusionProof: outboxRootWitness,
		});
		*!/
	}; */

	mainchainClient.subscribe('chain_newBlock', async (data?: Record<string, unknown>) => {
		const { blockHeader: receivedBlock } = data as unknown as Data;
		const newBlockHeader = chain.BlockHeader.fromJSON(receivedBlock).toObject();
		console.log(
			'\nReceived new block ' +
				newBlockHeader.height +
				' on mainchain ' +
				mainchainNodeInfo.chainID,
		);

		const sidechainAccount = await mainchainClient.invoke<ChainAccountJSON>(
			'interoperability_getChainAccount',
			{ chainID: sidechainNodeInfo.chainID },
		);
		let lastCertifiedHeight = sidechainAccount.lastCertificate.height;
		console.log(`sidechainAccount.lastCertificate.height: ${lastCertifiedHeight}`);

		if (sidechainAccount.status !== ChainStatus.TERMINATED) {
		}

		if (sidechainAccount.status === ChainStatus.TERMINATED) {
			// Create recovery transaction
			const inclusionProofAtLastCertifiedHeight = await inclusionProofModel.getByHeight(
				lastCertifiedHeight,
			);
			// console.log('inclusionProofAtLastCertifiedHeight: ', inclusionProofAtLastCertifiedHeight);
			if (!inclusionProofAtLastCertifiedHeight) {
				console.log(`No inclusionProof exists at a given height: ${lastCertifiedHeight}`);
			}

			if (inclusionProofAtLastCertifiedHeight) {
				/*
				const smt = new db.SparseMerkleTree();

				console.log('State Root -> ', inclusionProofAtLastCertifiedHeight.stateRoot.toString('hex'));
				console.log('recoveryKey -> ', recoveryKey.toString('hex'));
				console.log('siblingHashes -> ', inclusionProofAtLastCertifiedHeight.inclusionProof.siblingHashes);
				console.log('queries -> ', {
					bitmap: inclusionProofAtLastCertifiedHeight.inclusionProof.bitmap,
					key: inclusionProofAtLastCertifiedHeight.inclusionProof.key,
					value: inclusionProofAtLastCertifiedHeight.inclusionProof.value,
				});

				console.log(
					'Proving>here>>>> ',
					await smt.verify(inclusionProofAtLastCertifiedHeight.stateRoot, [recoveryKey], {
						siblingHashes: inclusionProofAtLastCertifiedHeight.inclusionProof.siblingHashes,
						queries: [
							{
								bitmap: inclusionProofAtLastCertifiedHeight.inclusionProof.bitmap,
								key: inclusionProofAtLastCertifiedHeight.inclusionProof.key,
								value: inclusionProofAtLastCertifiedHeight.inclusionProof.value,
							},
						],
					}),
				); */

				const messageRecoveryInitializationParams: MessageRecoveryInitializationParams = {
					// chainID: The ID of the sidechain whose terminated outbox account is to be initialized.
					chainID: Buffer.from(sidechainNodeInfo.chainID as string, 'hex'),
					// channel: The channel of this chain stored on the terminated sidechain.
					// Here, `this` refers to mainchain
					channel: codec.encode(
						channelSchema,
						channelDataJSONToObj(
							await sidechainClient.invoke<ChannelDataJSON>('interoperability_getChannel', {
								chainID: mainchainNodeInfo.chainID,
							}),
						),
					),
					// bitmap: The bitmap of the inclusion proof of the channel in the sidechain state tree.
					bitmap: inclusionProofAtLastCertifiedHeight.inclusionProof.bitmap,
					siblingHashes: inclusionProofAtLastCertifiedHeight.inclusionProof.siblingHashes,
				};

				const tx = new Transaction({
					module: MODULE_NAME_INTEROPERABILITY,
					command: 'initializeMessageRecovery',
					fee: BigInt(5450000000),
					params: codec.encodeJSON(
						messageRecoveryInitializationParamsSchema,
						messageRecoveryInitializationParams,
					),
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
				// TODO: post this tx to txpool & then call `interoperability_getTerminatedStateAccount` for verification
			}

			await inclusionProofModel.deleteProofsUntilHeight(lastCertifiedHeight);
		}
	});
})();
