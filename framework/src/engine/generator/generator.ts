/*
 * Copyright © 2021 Lisk Foundation
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
import * as fs from 'fs';
import { EventEmitter } from 'events';
import {
	Chain,
	Block,
	Event,
	Transaction,
	BlockHeader,
	BlockAssets,
	StateStore,
	EVENT_KEY_LENGTH,
} from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { address as addressUtil, bls } from '@liskhq/lisk-cryptography';
import { Database, Batch, SparseMerkleTree } from '@liskhq/lisk-db';
import { TransactionPool, events } from '@liskhq/lisk-transaction-pool';
import { MerkleTree } from '@liskhq/lisk-tree';
import { dataStructures, jobHandlers } from '@liskhq/lisk-utils';
import { validator } from '@liskhq/lisk-validator';
import { EVENT_NETWORK_READY } from '../events';
import { Logger } from '../../logger';
import { EngineConfig } from '../../types';
import { Network } from '../network';
import { Broadcaster } from './broadcaster';
import {
	DEFAULT_RELEASE_LIMIT,
	DEFAULT_RELEASE_INTERVAL,
	FORGE_INTERVAL,
	LOAD_TRANSACTION_RETRIES,
	NETWORK_RPC_GET_TRANSACTIONS,
	NETWORK_EVENT_POST_TRANSACTIONS_ANNOUNCEMENT,
	GENERATOR_EVENT_NEW_TRANSACTION_ANNOUNCEMENT,
	GENERATOR_EVENT_NEW_TRANSACTION,
	EMPTY_HASH,
	GENERATOR_STORE_KEY_PREFIX,
} from './constants';
import { Endpoint } from './endpoint';
import { GeneratorStore } from './generator_store';
import { NetworkEndpoint } from './network_endpoint';
import {
	encryptedMessageSchema,
	generatorKeysSchema,
	GetTransactionResponse,
	getTransactionsResponseSchema,
	keysFileSchema,
	plainGeneratorKeysSchema,
} from './schemas';
import { HighFeeGenerationStrategy } from './strategies';
import {
	Consensus,
	BlockGenerateInput,
	Keypair,
	PlainGeneratorKeyData,
	EncodedGeneratorKeys,
	KeysFile,
} from './types';
import { getOrDefaultLastGeneratedInfo, setLastGeneratedInfo } from './generated_info';
import { CONSENSUS_EVENT_FINALIZED_HEIGHT_CHANGED } from '../consensus/constants';
import { ABI, TransactionExecutionResult, TransactionVerifyResult } from '../../abi';
import { BFTModule } from '../bft';
import { isEmptyConsensusUpdate } from '../consensus';
import { getPathFromDataPath } from '../../utils/path';

interface GeneratorArgs {
	config: EngineConfig;
	chain: Chain;
	consensus: Consensus;
	bft: BFTModule;
	abi: ABI;
	network: Network;
}

interface GeneratorInitArgs {
	generatorDB: Database;
	blockchainDB: Database;
	logger: Logger;
}

const BLOCK_VERSION = 2;

export class Generator {
	public readonly events = new EventEmitter();

	private readonly _pool: TransactionPool;
	private readonly _config: EngineConfig;
	private readonly _chain: Chain;
	private readonly _consensus: Consensus;
	private readonly _bft: BFTModule;
	private readonly _abi: ABI;
	private readonly _network: Network;
	private readonly _endpoint: Endpoint;
	private readonly _networkEndpoint: NetworkEndpoint;
	private readonly _generationJob: jobHandlers.Scheduler<void>;
	private readonly _keypairs: dataStructures.BufferMap<Keypair>;
	private readonly _broadcaster: Broadcaster;
	private readonly _forgingStrategy: HighFeeGenerationStrategy;
	private readonly _blockTime: number;

	private _logger!: Logger;
	private _generatorDB!: Database;
	private _blockchainDB!: Database;

	public constructor(args: GeneratorArgs) {
		this._abi = args.abi;
		this._keypairs = new dataStructures.BufferMap();
		this._pool = new TransactionPool({
			maxPayloadLength: args.config.genesis.maxTransactionsSize,
			applyTransactions: async (transactions: Transaction[]) =>
				this._verifyTransactions(transactions),
		});
		this._config = args.config;
		this._blockTime = args.config.genesis.blockTime;
		this._chain = args.chain;
		this._bft = args.bft;
		this._consensus = args.consensus;
		this._network = args.network;
		this._broadcaster = new Broadcaster({
			network: this._network,
			transactionPool: this._pool,
			interval: DEFAULT_RELEASE_INTERVAL,
			limit: DEFAULT_RELEASE_LIMIT,
		});

		this._endpoint = new Endpoint({
			abi: this._abi,
			keypair: this._keypairs,
			consensus: this._consensus,
			blockTime: this._blockTime,
			chain: this._chain,
		});
		this._networkEndpoint = new NetworkEndpoint({
			abi: this._abi,
			broadcaster: this._broadcaster,
			chain: this._chain,
			network: this._network,
			pool: this._pool,
		});
		this._forgingStrategy = new HighFeeGenerationStrategy({
			maxTransactionsSize: this._chain.constants.maxTransactionsSize,
			abi: this._abi,
			pool: this._pool,
		});
		this._generationJob = new jobHandlers.Scheduler(
			async () => this._generateLoop(),
			FORGE_INTERVAL,
		);
	}

	public async init(args: GeneratorInitArgs): Promise<void> {
		this._logger = args.logger;
		this._generatorDB = args.generatorDB;
		this._blockchainDB = args.blockchainDB;

		this._broadcaster.init({
			logger: this._logger,
		});
		this._endpoint.init({
			generatorDB: this._generatorDB,
		});
		this._networkEndpoint.init({
			logger: this._logger,
		});
		await this._saveKeysFromFile();
		await this._loadGenerators();
		this._network.registerHandler(
			NETWORK_EVENT_POST_TRANSACTIONS_ANNOUNCEMENT,
			({ data, peerId }) => {
				this._networkEndpoint
					.handleEventPostTransactionsAnnouncement(data, peerId)
					.catch(err =>
						this._logger.error(
							{ err: err as Error, peerId },
							'Fail to handle transaction announcement',
						),
					);
			},
		);
		this._network.registerEndpoint(NETWORK_RPC_GET_TRANSACTIONS, async ({ data, peerId }) =>
			this._networkEndpoint.handleRPCGetTransactions(data, peerId),
		);
		this._networkEndpoint.event.on(GENERATOR_EVENT_NEW_TRANSACTION_ANNOUNCEMENT, e => {
			this.events.emit(GENERATOR_EVENT_NEW_TRANSACTION_ANNOUNCEMENT, e);
		});
		this._networkEndpoint.event.on(GENERATOR_EVENT_NEW_TRANSACTION, e => {
			this.events.emit(GENERATOR_EVENT_NEW_TRANSACTION, e);
		});

		const stateStore = new StateStore(this._blockchainDB);
		const { maxHeightPrecommitted, maxHeightCertified } = await this._bft.method.getBFTHeights(
			stateStore,
		);
		await Promise.all(
			this._handleFinalizedHeightChanged(maxHeightCertified + 1, maxHeightPrecommitted),
		);
	}

	public get endpoint(): Endpoint {
		return this._endpoint;
	}

	public get txpool(): TransactionPool {
		return this._pool;
	}

	public get broadcaster(): Broadcaster {
		return this._broadcaster;
	}

	public async start(): Promise<void> {
		this._networkEndpoint.start();
		this._pool.events.on(events.EVENT_TRANSACTION_REMOVED, event => {
			this._logger.debug(event, 'Transaction was removed from the pool.');
		});
		this._broadcaster.start();
		await this._pool.start();
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this._generationJob.start();

		this._network.events.on(EVENT_NETWORK_READY, () => {
			this._loadTransactionsFromNetwork().catch(err =>
				this._logger.error(
					{ err: err as Error },
					'Failed to load unconfirmed transactions from the network',
				),
			);
		});

		this._consensus.events.on(
			CONSENSUS_EVENT_FINALIZED_HEIGHT_CHANGED,
			({ from, to }: { from: number; to: number }) => {
				Promise.all(this._handleFinalizedHeightChanged(from, to)).catch((err: Error) =>
					this._logger.error({ err }, 'Fail to certify single commit'),
				);
			},
		);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async stop(): Promise<void> {
		this._pool.events.removeAllListeners(events.EVENT_TRANSACTION_REMOVED);
		this._broadcaster.stop();
		this._pool.stop();
		this._generationJob.stop();
		this._networkEndpoint.stop();
	}

	public onNewBlock(block: Block): void {
		if (block.transactions.length) {
			for (const transaction of block.transactions) {
				this._pool.remove(transaction);
			}
		}
	}

	public getPooledTransactions(): Transaction[] {
		return this._pool.getAll() as Transaction[];
	}

	public onDeleteBlock(block: Block): void {
		if (block.transactions.length) {
			for (const transaction of block.transactions) {
				this._pool.add(transaction).catch(err => {
					this._logger.error({ err: err as Error }, 'Failed to add transaction back to the pool');
				});
			}
		}
	}

	public async generateBlock(input: BlockGenerateInput): Promise<Block> {
		const block = await this._generateBlock({
			...input,
		}).catch(async err => {
			await this._abi.clear({});
			throw err;
		});
		return block;
	}

	public async _loadTransactionsFromNetwork(): Promise<void> {
		for (let retry = 0; retry < LOAD_TRANSACTION_RETRIES; retry += 1) {
			try {
				await this._getUnconfirmedTransactionsFromNetwork();
				return;
			} catch (err) {
				if (err && retry === LOAD_TRANSACTION_RETRIES - 1) {
					this._logger.error(
						{ err: err as Error },
						`Failed to get transactions from network after ${LOAD_TRANSACTION_RETRIES} retries`,
					);
				}
			}
		}
	}

	private async _verifyTransactions(transactions: Transaction[]): Promise<void> {
		for (const transaction of transactions) {
			const { result } = await this._abi.verifyTransaction({
				contextID: Buffer.alloc(0),
				transaction,
				header: this._chain.lastBlock.header.toObject(),
			});
			if (result === TransactionVerifyResult.INVALID) {
				throw new Error('Transaction is not valid');
			}
		}
	}

	private async _saveKeysFromFile(): Promise<void> {
		if (!this._config.generator.keys.fromFile) {
			return;
		}
		const filePath = getPathFromDataPath(
			this._config.generator.keys.fromFile,
			this._config.system.dataPath,
		);
		this._logger.debug({ filePath }, 'Reading validator keys from a file');
		const keysFile = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
		validator.validate<KeysFile>(keysFileSchema, keysFile);

		const generatorStore = new GeneratorStore(this._generatorDB);
		const batch = new Batch();
		const subStore = generatorStore.getGeneratorStore(GENERATOR_STORE_KEY_PREFIX);
		for (const key of keysFile.keys) {
			this._logger.info({ address: key.address }, 'saving generator from file');
			if (key.encrypted && Object.keys(key.encrypted).length) {
				await subStore.set(
					addressUtil.getAddressFromLisk32Address(key.address),
					codec.encode(generatorKeysSchema, {
						type: 'encrypted',
						data: codec.encode(encryptedMessageSchema, key.encrypted),
					}),
				);
			} else if (key.plain) {
				await subStore.set(
					addressUtil.getAddressFromLisk32Address(key.address),
					codec.encode(generatorKeysSchema, {
						type: 'plain',
						data: codec.encode(plainGeneratorKeysSchema, {
							blsKey: Buffer.from(key.plain.blsKey, 'hex'),
							blsPrivateKey: Buffer.from(key.plain.blsPrivateKey, 'hex'),
							generatorKey: Buffer.from(key.plain.generatorKey, 'hex'),
							generatorPrivateKey: Buffer.from(key.plain.generatorPrivateKey, 'hex'),
						}),
					}),
				);
			}
		}
		generatorStore.finalize(batch);
		await this._generatorDB.write(batch);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async _loadGenerators(): Promise<void> {
		const generatorStore = new GeneratorStore(this._generatorDB);
		const subStore = generatorStore.getGeneratorStore(GENERATOR_STORE_KEY_PREFIX);
		const encodedGeneratorKeysList = await subStore.iterate({
			gte: Buffer.alloc(20, 0),
			lte: Buffer.alloc(20, 255),
		});
		for (const { key, value } of encodedGeneratorKeysList) {
			const encodedGeneratorKeys = codec.decode<EncodedGeneratorKeys>(generatorKeysSchema, value);
			if (encodedGeneratorKeys.type === 'plain') {
				const keys = codec.decode<PlainGeneratorKeyData>(
					plainGeneratorKeysSchema,
					encodedGeneratorKeys.data,
				);
				this._keypairs.set(key, {
					publicKey: keys.generatorKey,
					privateKey: keys.generatorPrivateKey,
					blsSecretKey: keys.blsPrivateKey,
				});
				this._logger.info(
					`Block generation enabled for address: ${addressUtil.getLisk32AddressFromAddress(key)}`,
				);
			}
		}
	}

	/**
	 * Loads transactions from the network:
	 * - Validates each transaction from the network and applies a penalty if invalid.
	 * - Calls processUnconfirmedTransaction for each transaction.
	 */
	private async _getUnconfirmedTransactionsFromNetwork(): Promise<void> {
		this._logger.info('Loading transactions from the network');

		const { data } = (await this._network.request({
			procedure: NETWORK_RPC_GET_TRANSACTIONS,
		})) as unknown as {
			data: Buffer;
		};
		const transactionResponse = codec.decode<GetTransactionResponse>(
			getTransactionsResponseSchema,
			data,
		);

		validator.validate(getTransactionsResponseSchema, transactionResponse);

		const transactions = transactionResponse.transactions.map(transaction =>
			Transaction.fromBytes(transaction),
		);

		for (const transaction of transactions) {
			const { error } = await this._pool.add(transaction);

			if (error) {
				this._logger.error({ err: error }, 'Failed to add transaction to pool.');
				throw error;
			}
		}
	}

	private async _generateLoop(): Promise<void> {
		const stateStore = new StateStore(this._blockchainDB);

		const MS_IN_A_SEC = 1000;
		const currentTime = Math.floor(new Date().getTime() / MS_IN_A_SEC);
		const currentSlot = this._bft.method.getSlotNumber(currentTime);

		const currentSlotTime = this._bft.method.getSlotTime(currentSlot);

		const waitThreshold = this._blockTime / 5;
		const lastBlockSlot = this._bft.method.getSlotNumber(this._chain.lastBlock.header.timestamp);

		if (currentSlot === lastBlockSlot) {
			this._logger.trace({ slot: currentSlot }, 'Block already generated for the current slot');
			return;
		}

		const nextHeight = this._chain.lastBlock.header.height + 1;

		const generator = await this._bft.method.getGeneratorAtTimestamp(
			stateStore,
			nextHeight,
			currentTime,
		);
		const validatorKeypair = this._keypairs.get(generator.address);

		if (validatorKeypair === undefined) {
			this._logger.debug({ currentSlot }, 'Waiting for validator slot');
			return;
		}

		// If last block slot is way back than one block
		// and still time left as per threshold specified
		if (lastBlockSlot < currentSlot - 1 && currentTime <= currentSlotTime + waitThreshold) {
			this._logger.info('Skipping forging to wait for last block');
			this._logger.debug(
				{
					currentSlot,
					lastBlockSlot,
					waitThreshold,
				},
				'Slot information',
			);
			return;
		}
		const generatedBlock = await this._generateBlock({
			height: nextHeight,
			generatorAddress: generator.address,
			privateKey: validatorKeypair.privateKey,
			timestamp: currentTime,
		});
		this._logger.info(
			{
				id: generatedBlock.header.id,
				height: generatedBlock.header.height,
				generatorAddress: addressUtil.getLisk32AddressFromAddress(generator.address),
			},
			'Generated new block',
		);

		await this._consensus.execute(generatedBlock as never);
	}

	private async _generateBlock(input: BlockGenerateInput): Promise<Block> {
		const { generatorAddress, timestamp, privateKey, height } = input;
		const stateStore = new StateStore(this._blockchainDB);
		const generatorStore = new GeneratorStore(input.db ?? this._generatorDB);

		const { maxHeightPrevoted } = await this._bft.method.getBFTHeights(stateStore);
		const { height: maxHeightGenerated } = await getOrDefaultLastGeneratedInfo(
			generatorStore,
			generatorAddress,
		);
		const aggregateCommit = await this._consensus.getAggregateCommit(stateStore);
		const impliesMaxPrevotes = await this._bft.method.impliesMaximalPrevotes(stateStore, {
			height,
			maxHeightGenerated,
			generatorAddress,
		});

		const blockHeader = new BlockHeader({
			generatorAddress,
			height,
			previousBlockID: this._chain.lastBlock.header.id,
			version: BLOCK_VERSION,
			maxHeightPrevoted,
			maxHeightGenerated,
			impliesMaxPrevotes,
			aggregateCommit,
			assetRoot: Buffer.alloc(0),
			stateRoot: Buffer.alloc(0),
			eventRoot: Buffer.alloc(0),
			transactionRoot: Buffer.alloc(0),
			validatorsHash: Buffer.alloc(0),
			signature: Buffer.alloc(0),
			timestamp,
		});

		const blockEvents = [];
		let transactions: Transaction[];

		const { contextID } = await this._abi.initStateMachine({
			header: blockHeader.toObject(),
		});
		const { assets } = await this._abi.insertAssets({
			contextID,
			finalizedHeight: this._chain.finalizedHeight,
		});
		const blockAssets = new BlockAssets(assets);

		await this._bft.beforeTransactionsExecute(stateStore, blockHeader);
		const { events: beforeTxsEvents } = await this._abi.beforeTransactionsExecute({
			contextID,
			assets: blockAssets.getAll(),
		});
		blockEvents.push(...beforeTxsEvents.map(e => new Event(e)));
		if (input.transactions) {
			const { transactions: executedTxs, events: txEvents } = await this._executeTransactions(
				contextID,
				blockHeader,
				blockAssets,
				input.transactions,
			);
			blockEvents.push(...txEvents);
			transactions = executedTxs;
		} else {
			const { transactions: executedTxs, events: txEvents } =
				await this._forgingStrategy.getTransactionsForBlock(contextID, blockHeader, blockAssets);
			blockEvents.push(...txEvents);
			transactions = executedTxs;
		}
		const afterResult = await this._abi.afterTransactionsExecute({
			contextID,
			assets: blockAssets.getAll(),
			transactions: transactions.map(tx => tx.toObject()),
		});
		blockEvents.push(...afterResult.events.map(e => new Event(e)));
		if (
			!isEmptyConsensusUpdate(
				afterResult.preCommitThreshold,
				afterResult.certificateThreshold,
				afterResult.nextValidators,
			)
		) {
			await this._bft.method.setBFTParameters(
				stateStore,
				afterResult.preCommitThreshold,
				afterResult.certificateThreshold,
				afterResult.nextValidators,
			);
		}

		stateStore.finalize(new Batch());

		// calculate transaction root
		const txTree = new MerkleTree();
		await txTree.init(transactions.map(tx => tx.id));
		const transactionRoot = txTree.root;
		blockHeader.transactionRoot = transactionRoot;
		blockHeader.assetRoot = await blockAssets.getRoot();

		// Add event root calculation
		const keypairs = [];
		for (let index = 0; index < blockEvents.length; index += 1) {
			const e = blockEvents[index];
			e.setIndex(index);
			const pairs = e.keyPair();
			for (const pair of pairs) {
				keypairs.push(pair);
			}
		}
		const smt = new SparseMerkleTree(EVENT_KEY_LENGTH);
		const eventRoot = await smt.update(EMPTY_HASH, keypairs);
		blockHeader.eventRoot = eventRoot;
		// Assign root hash calculated in SMT to state root of block header
		const { stateRoot } = await this._abi.commit({
			contextID,
			dryRun: true,
			expectedStateRoot: Buffer.alloc(0),
			stateRoot: this._chain.lastBlock.header.stateRoot as Buffer,
		});
		blockHeader.stateRoot = stateRoot;

		// Set validatorsHash
		const { validatorsHash } = await this._bft.method.getBFTParameters(stateStore, height + 1);
		blockHeader.validatorsHash = validatorsHash;
		blockHeader.sign(this._chain.chainID, privateKey);

		const generatedBlock = new Block(blockHeader, transactions, blockAssets);

		await setLastGeneratedInfo(generatorStore, blockHeader.generatorAddress, blockHeader);

		const batch = new Batch();
		generatorStore.finalize(batch);
		await this._generatorDB.write(batch);

		await this._abi.clear({});

		return generatedBlock;
	}

	private _handleFinalizedHeightChanged(from: number, to: number): Promise<void>[] {
		const promises = [];
		const stateStore = new StateStore(this._blockchainDB);
		for (const [address, pairs] of this._keypairs.entries()) {
			for (let height = from + 1; height < to; height += 1) {
				promises.push(
					this._certifySingleCommitForChangedHeight(
						stateStore,
						height,
						address,
						pairs.blsSecretKey,
					),
				);
			}
			promises.push(this._certifySingleCommit(stateStore, to, address, pairs.blsSecretKey));
		}
		return promises;
	}

	private async _certifySingleCommitForChangedHeight(
		stateStore: StateStore,
		height: number,
		generatorAddress: Buffer,
		blsSK: Buffer,
	): Promise<void> {
		const paramExist = await this._bft.method.existBFTParameters(stateStore, height + 1);
		if (!paramExist) {
			return;
		}
		await this._certifySingleCommit(stateStore, height, generatorAddress, blsSK);
	}

	private async _certifySingleCommit(
		stateStore: StateStore,
		height: number,
		generatorAddress: Buffer,
		blsSK: Buffer,
	): Promise<void> {
		const params = await this._bft.method.getBFTParameters(stateStore, height);
		const isActive = params.validators.find(v => v.address.equals(generatorAddress)) !== undefined;
		if (!isActive) {
			return;
		}

		const blockHeader = await this._chain.dataAccess.getBlockHeaderByHeight(height);
		const validatorInfo = {
			address: generatorAddress,
			blsPublicKey: bls.getPublicKeyFromPrivateKey(blsSK),
			blsSecretKey: blsSK,
		};
		this._consensus.certifySingleCommit(blockHeader, validatorInfo);
		this._logger.debug(
			{
				height,
				generator: addressUtil.getLisk32AddressFromAddress(generatorAddress),
			},
			'Certified single commit',
		);
	}

	private async _executeTransactions(
		contextID: Buffer,
		header: BlockHeader,
		assets: BlockAssets,
		transactions: Transaction[],
	): Promise<{ transactions: Transaction[]; events: Event[] }> {
		const executedTransactions = [];
		const executedEvents = [];
		for (const transaction of transactions) {
			try {
				const { result: verifyResult } = await this._abi.verifyTransaction({
					contextID,
					transaction,
					header: header.toObject(),
				});
				if (verifyResult !== TransactionVerifyResult.OK) {
					throw new Error('Transaction is not valid');
				}
				const { events: txEvents, result: executeResult } = await this._abi.executeTransaction({
					contextID,
					header: header.toObject(),
					transaction,
					assets: assets.getAll(),
					dryRun: false,
				});
				if (executeResult === TransactionExecutionResult.INVALID) {
					this._pool.remove(transaction);
					throw new Error('Transaction is not valid');
				}
				executedTransactions.push(transaction);
				executedEvents.push(...txEvents.map(e => new Event(e)));
			} catch (error) {
				// If transaction can't be processed then discard all transactions
				// from that account as other transactions will be higher nonce
				continue;
			}
		}
		return { transactions: executedTransactions, events: executedEvents };
	}
}
