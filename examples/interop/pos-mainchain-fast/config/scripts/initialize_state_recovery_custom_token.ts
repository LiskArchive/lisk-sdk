import {
	apiClient,
	codec,
	cryptography,
	Transaction,
	chain,
	db,
	ProveResponse,
	OutboxRootWitness,
	ChainAccountJSON,
	ChainStatus,
	stateRecoveryInitParamsSchema,
} from 'lisk-sdk';
import { keys } from '../default/dev-validators.json';
import { ensureDir } from 'fs-extra';
import { join } from 'path';
import * as os from 'os';

```

Scenario: 

Mainchain, sidechain-one and sidechain-two in network. 
All sidechains have been registered and active. 
Sidechain-one sends a custom token to sidechain-two via cross chain transfer. 
Sidechain two becomes terminated on the mainchain.

This script is to recover custom tokens from sidechain two to sidechian one.

```;

// Schemas
export const inclusionProofsSchema = {
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
					storeValue: { dataType: 'bytes', fieldNumber: 4 },
					storeKey: { dataType: 'bytes', fieldNumber: 5 },
				},
			},
		},
	},
};

export const MIN_MODULE_NAME_LENGTH = 1;
export const MAX_MODULE_NAME_LENGTH = 32;

const userStoreSchema = {
	$id: '/token/store/user',
	type: 'object',
	required: ['availableBalance', 'lockedBalances'],
	properties: {
		availableBalance: { dataType: 'uint64', fieldNumber: 1 },
		lockedBalances: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['module', 'amount'],
				properties: {
					module: {
						dataType: 'string',
						fieldNumber: 1,
						minLength: MIN_MODULE_NAME_LENGTH,
						maxLength: MAX_MODULE_NAME_LENGTH,
					},
					amount: { dataType: 'uint64', fieldNumber: 2 },
				},
			},
		},
	},
};

const chainDataSchema = {
	$id: '/modules/interoperability/chainData',
	type: 'object',
	required: ['name', 'lastCertificate', 'status'],
	properties: {
		name: {
			dataType: 'string',
			fieldNumber: 1,
		},
		lastCertificate: {
			type: 'object',
			fieldNumber: 2,
			required: ['height', 'timestamp', 'stateRoot', 'validatorsHash'],
			properties: {
				height: {
					dataType: 'uint32',
					fieldNumber: 1,
				},
				timestamp: {
					dataType: 'uint32',
					fieldNumber: 2,
				},
				stateRoot: {
					dataType: 'bytes',
					minLength: 32,
					maxLength: 32,
					fieldNumber: 3,
				},
				validatorsHash: {
					dataType: 'bytes',
					minLength: 32,
					maxLength: 32,
					fieldNumber: 4,
				},
			},
		},
		status: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

// Types
type KVStore = db.Database;
interface Data {
	readonly blockHeader: chain.BlockHeaderJSON;
}
type Primitive = string | number | bigint | boolean | null | undefined;
type Replaced<T, TReplace, TWith, TKeep = Primitive> = T extends TReplace | TKeep
	? T extends TReplace
		? TWith | Exclude<T, TReplace>
		: T
	: {
			[P in keyof T]: Replaced<T[P], TReplace, TWith, TKeep>;
	  };

export type JSONObject<T> = Replaced<T, bigint | Buffer, string>;
interface InclusionProof {
	height: number;
	stateRoot: Buffer;
	inclusionProof: OutboxRootWitness & { key: Buffer; value: Buffer };
	storeValue: Buffer;
	storeKey: Buffer;
}

interface StateRecoveryInitParams {
	chainID: Buffer;
	sidechainAccount: Buffer;
	bitmap: Buffer;
	siblingHashes: Buffer[];
}

// Utils
const getDBInstance = async (
	dataPath: string,
	dbName = 'lisk-framework-chain-connector-plugin.db',
): Promise<KVStore> => {
	const dirPath = join(dataPath.replace('~', os.homedir()), 'plugins/data', dbName);
	await ensureDir(dirPath);

	return new db.Database(dirPath);
};

export const proveResponseJSONToObj = (proveResponseJSON: ProveResponseJSON): ProveResponse => {
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

// Constants
const DB_KEY_INCLUSION_PROOF = Buffer.from([1]);

// DB class
class RecoveryDB {
	private readonly _db: KVStore;

	public constructor(db: KVStore) {
		this._db = db;
	}

	public close() {
		this._db.close();
	}

	public async getAllInclusionProofs(): Promise<InclusionProof[]> {
		let inclusionProofs: InclusionProof[] = [];
		try {
			const encodedInfo = await this._db.get(DB_KEY_INCLUSION_PROOF);
			inclusionProofs = codec.decode<{ inclusionProofs: InclusionProof[] }>(
				inclusionProofsSchema,
				encodedInfo,
			).inclusionProofs;
		} catch (error) {
			if (!(error instanceof db.NotFoundError)) {
				throw error;
			}
		}
		return inclusionProofs;
	}

	public async getInclusionProofByHeight(height: number): Promise<InclusionProof | undefined> {
		const inclusionProofs = await this.getAllInclusionProofs();

		return inclusionProofs.find(proofs => proofs.height === height);
	}

	public async deleteInclusionProofsUntilHeight(height: number) {
		const inclusionProofs = await this.getAllInclusionProofs();
		const encodedInfo = codec.encode(inclusionProofsSchema, {
			inclusionProofs: inclusionProofs.filter(proofs => proofs.height > height),
		});
		await this._db.set(DB_KEY_INCLUSION_PROOF, encodedInfo);
	}

	public async setInclusionProof(inclusionProof: InclusionProof) {
		const allInclusionProofs = await this.getAllInclusionProofs();
		allInclusionProofs.push(inclusionProof);
		const encodedInfo = codec.encode(inclusionProofsSchema, {
			inclusionProofs: allInclusionProofs,
		});
		await this._db.set(DB_KEY_INCLUSION_PROOF, encodedInfo);
	}
}

type ProveResponseJSON = JSONObject<ProveResponse>;
(async () => {
	console.log('Starting state recovery initialization plugin ...');

	const { address, utils } = cryptography;

	let recoveryDB: RecoveryDB;

	try {
		recoveryDB = new RecoveryDB(await getDBInstance('~/.lisk/auxiliary/recoveryLSK'));
		console.log('Recovery DB is initialized successfully.');
	} catch (error) {
		console.log('Error occurred while initializing DB', error);

		process.exit();
	}
	const sidechainOneSenderTokenAddress = 'lskxz85sur2yo22dmcxybe39uvh2fg7s2ezxq4ny9'; // TODO: Address and binary address must match and key must be from sidechain one
	const sidechaiOneSenderBinaryAddress = address.getAddressFromPublicKey(
		Buffer.from('2136cd87c5b60224291b0c374f315d325fd58ce10ca4d5989d1e2d371dc428ef', 'hex'),
	);

	const mainchainClient = await apiClient.createIPCClient(`~/.lisk/mainchain-node-one`);
	const sidechainOneClient = await apiClient.createIPCClient(`~/.lisk/pos-sidechain-example-one`);
	const sidechainTwoClient = await apiClient.createIPCClient(`~/.lisk/pos-sidechain-example-two`);
	const sidechainOneNodeInfo = await sidechainOneClient.invoke('system_getNodeInfo');
	const sidechainTwoNodeInfo = await sidechainTwoClient.invoke('system_getNodeInfo');

	const getProofForMonitoringKey = async (client: apiClient.APIClient, monitoredKey) => {
		const proof = await client.invoke<ProveResponseJSON>('state_prove', {
			queryKeys: [monitoredKey.toString('hex')],
		});

		return proveResponseJSONToObj(proof);
	};

	const getBalances = async (client: apiClient.APIClient, lskAddress: string, tokenID: Buffer) => {
		const balance = await client.invoke<{
			availableBalance: string;
			lockedBalances: {
				module: string;
				amount: string;
			}[];
		}>('token_getBalance', {
			address: lskAddress,
			tokenID: tokenID.toString('hex'),
		});

		return {
			availableBalance: BigInt(balance.availableBalance),
			lockedBalances: balance.lockedBalances.map(b => ({
				amount: BigInt(b.amount),
				module: b.module,
			})),
		};
	};

	// Collect inclusion proofs on sidechain two and save it in recoveryDB
	sidechainTwoClient.subscribe('chain_newBlock', async (data?: Record<string, unknown>) => {
		const { blockHeader: receivedBlock } = data as unknown as Data;

		const newBlockHeader = chain.BlockHeader.fromJSON(receivedBlock).toObject();
		console.log(
			`\nReceived new block on sidechain ${sidechainOneNodeInfo.chainID} with height ${newBlockHeader.height}\n`,
		);
		const CUSTOM_TOKEN_ID = Buffer.from('04000001000000000', 'hex');
		const storeKey = Buffer.concat([sidechaiOneSenderBinaryAddress, CUSTOM_TOKEN_ID]);
		const keyToBeRecovered = Buffer.concat([
			Buffer.from('3c469e9d0000', 'hex'),
			utils.hash(storeKey),
		]);
		console.log('keyToBeRecovered>>>>>>>>>>>>>>>>>>>>>', keyToBeRecovered);

		const { proof } = await getProofForMonitoringKey(sidechainTwoClient, keyToBeRecovered);

		const smt = new db.SparseMerkleTree();

		console.log(
			'Proving>>>>> ',
			await smt.verify(newBlockHeader.stateRoot, [proof.queries[0].key], proof),
		);

		const inclusionProof = {
			key: proof.queries[0].key,
			value: proof.queries[0].value,
			bitmap: proof.queries[0].bitmap,
			siblingHashes: proof.siblingHashes,
		};

		const userBalance = await getBalances(
			sidechainOneClient,
			sidechainOneSenderTokenAddress,
			CUSTOM_TOKEN_ID,
		);
		console.log('User balance---->', userBalance);
		const storeValue = codec.encode(userStoreSchema, userBalance);
		console.log('StoreValue ------>', storeValue);

		await recoveryDB.setInclusionProof({
			inclusionProof,
			height: newBlockHeader.height,
			stateRoot: newBlockHeader.stateRoot,
			storeKey,
			storeValue,
		});
		console.log(`Successfully stored inclusion proof at height ${newBlockHeader.height}!\n`);
	});

	mainchainClient.subscribe('chain_newBlock', async (_data?: Record<string, unknown>) => {
		const sidechainTwoChainAccount = await mainchainClient.invoke<ChainAccountJSON>(
			'interoperability_getChainAccount',
			{ chainID: sidechainTwoNodeInfo.chainID },
		);

		if (sidechainTwoChainAccount.status !== ChainStatus.TERMINATED) {
			// Delete all the inclusion proofs until lastCertificate height
			await recoveryDB.deleteInclusionProofsUntilHeight(
				sidechainTwoChainAccount.lastCertificate.height - 1,
			);
			console.log(
				`Successfully deleted all the inclusion proofs before last certificate height ${sidechainTwoChainAccount.lastCertificate.height}!`,
			);
		} else {
			// Create state recovery init transaction
			const relayerkeyInfo = keys[4];
			const keyToBeRecovered = Buffer.concat([
				Buffer.from([0x83, 0xed, 0x0d, 0x25, 0x80, 0x00]),
				utils.hash(sidechainTwoNodeInfo.chainID as Buffer),
			]);

			const { proof } = await getProofForMonitoringKey(sidechainTwoClient, keyToBeRecovered);

			const stateRecoveryInitParams: StateRecoveryInitParams = {
				chainID: Buffer.from(sidechainTwoNodeInfo.chainID as string, 'hex'),
				sidechainAccount: codec.encode(chainDataSchema, sidechainTwoChainAccount),
				bitmap: proof.queries[0].bitmap,
				siblingHashes: proof.siblingHashes,
			};

			const { nonce: sidechainOneNonce } = await sidechainOneClient.invoke<{ nonce: string }>(
				'auth_getAuthAccount',
				{
					address: address.getLisk32AddressFromPublicKey(
						Buffer.from(relayerkeyInfo.publicKey, 'hex'),
					),
				},
			);

			const tx = new Transaction({
				module: 'interoperability',
				command: 'initializeStateRecovery',
				fee: BigInt(1000000000),
				params: codec.encodeJSON(stateRecoveryInitParamsSchema, stateRecoveryInitParams),
				nonce: BigInt(sidechainOneNonce),
				senderPublicKey: Buffer.from(relayerkeyInfo.publicKey, 'hex'),
				signatures: [],
			});

			tx.sign(
				Buffer.from(sidechainOneNodeInfo.chainID as string, 'hex'),
				Buffer.from(relayerkeyInfo.privateKey, 'hex'),
			);

			const result = await sidechainOneClient.invoke<{
				transactionId: string;
			}>('txpool_postTransaction', {
				transaction: tx.getBytes().toString('hex'),
			});

			console.log(
				'\nSent state recovery initialization transaction. Result from transaction pool is: ',
				result,
			);

			cleanUp();
		}
	});

	const cleanUp = async () => {
		await sidechainOneClient.disconnect();
		await sidechainTwoClient.disconnect();
		await mainchainClient.disconnect();
		recoveryDB.close();
		console.log(
			'>>>>>> Closed recovery DB, disconnected API clients and exiting the app. <<<<<<\n',
		);
		process.exit(0);
	};

	process.on('uncaughtException', async err => {
		// Handle error safely
		console.log('uncaughtException: ', err);

		await cleanUp();
	});

	process.on('unhandledRejection', async err => {
		// Handle error safely
		console.log('unhandledRejection: ', err);
		await cleanUp();
	});

	//do something when app is closing
	process.on('exit', cleanUp);

	//catches ctrl+c event
	process.on('SIGINT', cleanUp);
})();
