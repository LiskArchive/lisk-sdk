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

import {
	Chain,
	Block,
	Transaction,
	BlockHeader,
	BlockAssets,
	StateStore,
	SMTStore,
	EVENT_KEY_LENGTH,
} from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import {
	decryptPassphraseWithPassword,
	generatePrivateKey,
	getAddressFromPublicKey,
	getPrivateAndPublicKeyFromPassphrase,
	getPublicKeyFromPrivateKey,
	parseEncryptedPassphrase,
} from '@liskhq/lisk-cryptography';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import { TransactionPool, events } from '@liskhq/lisk-transaction-pool';
import { MerkleTree, SparseMerkleTree } from '@liskhq/lisk-tree';
import { dataStructures, jobHandlers } from '@liskhq/lisk-utils';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { APP_EVENT_NETWORK_READY } from '../events';
import { Logger } from '../../logger';
import { GenerationConfig, GenesisConfig } from '../../types';
import { Network } from '../network';
import {
	EventQueue,
	StateMachine,
	TransactionContext,
	VerifyStatus,
	BlockContext,
	GenesisBlockContext,
	APIContext,
} from '../state_machine';
import { Broadcaster } from './broadcaster';
import {
	DEFAULT_RELEASE_LIMIT,
	DEFAULT_RELEASE_INTERVAL,
	FORGE_INTERVAL,
	LOAD_TRANSACTION_RETRIES,
	NETWORK_RPC_GET_TRANSACTIONS,
	NETWORK_EVENT_POST_TRANSACTIONS_ANNOUNCEMENT,
	EMPTY_BUFFER,
	EMPTY_HASH,
	GENESIS_BLOCK_VERSION,
} from './constants';
import { GenerationContext } from './context';
import { Endpoint } from './endpoint';
import { GeneratorStore } from './generator_store';
import { NetworkEndpoint } from './network_endpoint';
import { GetTransactionResponse, getTransactionsResponseSchema } from './schemas';
import { HighFeeGenerationStrategy } from './strategies';
import {
	Consensus,
	GeneratorModule,
	BFTAPI,
	ValidatorAPI,
	BlockGenerateInput,
	GenesisBlockGenerateInput,
	Keypair,
} from './types';
import { createAPIContext, createNewAPIContext } from '../state_machine/api_context';
import { getOrDefaultLastGeneratedInfo, setLastGeneratedInfo } from './generated_info';
import { CONSENSUS_EVENT_FINALIZED_HEIGHT_CHANGED } from '../consensus/constants';

interface GeneratorArgs {
	genesisConfig: GenesisConfig;
	generationConfig: GenerationConfig;
	chain: Chain;
	consensus: Consensus;
	bftAPI: BFTAPI;
	validatorAPI: ValidatorAPI;
	stateMachine: StateMachine;
	network: Network;
}

interface GeneratorInitArgs {
	generatorDB: KVStore;
	blockchainDB: KVStore;
	logger: Logger;
}

const BLOCK_VERSION = 2;

export class Generator {
	private readonly _modules: GeneratorModule[] = [];
	private readonly _pool: TransactionPool;
	private readonly _config: GenerationConfig;
	private readonly _chain: Chain;
	private readonly _consensus: Consensus;
	private readonly _bftAPI: BFTAPI;
	private readonly _validatorAPI: ValidatorAPI;
	private readonly _stateMachine: StateMachine;
	private readonly _network: Network;
	private readonly _endpoint: Endpoint;
	private readonly _networkEndpoint: NetworkEndpoint;
	private readonly _generationJob: jobHandlers.Scheduler<void>;
	private readonly _keypairs: dataStructures.BufferMap<Keypair>;
	private readonly _broadcaster: Broadcaster;
	private readonly _forgingStrategy: HighFeeGenerationStrategy;

	private _logger!: Logger;
	private _generatorDB!: KVStore;
	private _blockchainDB!: KVStore;

	public constructor(args: GeneratorArgs) {
		this._config = args.generationConfig;
		this._keypairs = new dataStructures.BufferMap();
		this._pool = new TransactionPool({
			maxPayloadLength: args.genesisConfig.maxTransactionsSize,
			minFeePerByte: args.genesisConfig.minFeePerByte,
			baseFees: args.genesisConfig.baseFees.map(fees => ({
				...fees,
				baseFee: BigInt(fees.baseFee),
			})),
			applyTransactions: async (transactions: Transaction[]) =>
				this._verifyTransaction(transactions),
		});
		if (this._config.waitThreshold >= args.genesisConfig.blockTime) {
			throw Error(
				`generation.waitThreshold=${this._config.waitThreshold} is greater or equal to genesisConfig.blockTime=${args.genesisConfig.blockTime}. It impacts the block generation and propagation. Please use a smaller value for generation.waitThreshold`,
			);
		}
		this._chain = args.chain;
		this._validatorAPI = args.validatorAPI;
		this._bftAPI = args.bftAPI;
		this._consensus = args.consensus;
		this._stateMachine = args.stateMachine;
		this._network = args.network;
		this._broadcaster = new Broadcaster({
			network: this._network,
			transactionPool: this._pool,
			interval: DEFAULT_RELEASE_INTERVAL,
			limit: DEFAULT_RELEASE_LIMIT,
		});

		this._endpoint = new Endpoint({
			generators: this._config.generators,
			keypair: this._keypairs,
			consensus: this._consensus,
			broadcaster: this._broadcaster,
			pool: this._pool,
			stateMachine: this._stateMachine,
		});
		this._networkEndpoint = new NetworkEndpoint({
			broadcaster: this._broadcaster,
			chain: this._chain,
			network: this._network,
			pool: this._pool,
			stateMachine: this._stateMachine,
		});
		this._forgingStrategy = new HighFeeGenerationStrategy({
			chain: this._chain,
			maxTransactionsSize: this._chain.constants.maxTransactionsSize,
			stateMachine: this._stateMachine,
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
			blockchainDB: this._blockchainDB,
			generatorDB: this._generatorDB,
			logger: this._logger,
		});
		this._networkEndpoint.init({
			blockchainDB: this._blockchainDB,
			logger: this._logger,
		});
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

		const apiContext = createNewAPIContext(this._blockchainDB);
		const maxRemovalHeight = await this._consensus.getMaxRemovalHeight();
		const { maxHeightPrecommitted } = await this._bftAPI.getBFTHeights(apiContext);
		await Promise.all(this._handleFinalizedHeightChanged(maxRemovalHeight, maxHeightPrecommitted));
	}

	public get endpoint(): Endpoint {
		return this._endpoint;
	}

	public registerModule(mod: GeneratorModule): void {
		const existingModule = this._modules.find(m => m.id === mod.id);
		if (existingModule) {
			throw new Error(`Module ${mod.id} is already registered.`);
		}
		this._modules.push(mod);
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

		this._network.events.on(APP_EVENT_NETWORK_READY, () => {
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

	public async generateGenesisBlock(input: GenesisBlockGenerateInput): Promise<Block> {
		const assets = new BlockAssets(
			input.assets.map(asset => ({
				moduleID: asset.moduleID,
				data: codec.encode(asset.schema, asset.data),
			})),
		);
		assets.sort();
		const assetsRoot = await assets.getRoot();
		const height = input.height ?? 0;
		const previousBlockID = input.previousBlockID ?? Buffer.alloc(32, 0);
		const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
		const header = new BlockHeader({
			version: GENESIS_BLOCK_VERSION,
			previousBlockID,
			height,
			timestamp,
			generatorAddress: EMPTY_BUFFER,
			maxHeightGenerated: 0,
			maxHeightPrevoted: height,
			signature: EMPTY_BUFFER,
			transactionRoot: EMPTY_HASH,
			assetsRoot,
			aggregateCommit: {
				height: 0,
				aggregationBits: EMPTY_BUFFER,
				certificateSignature: EMPTY_BUFFER,
			},
		});
		// Information is not stored in the database
		const db = new InMemoryKVStore();
		const eventQueue = new EventQueue();
		const stateStore = new StateStore(db);
		const blockCtx = new GenesisBlockContext({
			eventQueue,
			header,
			assets,
			logger: this._logger,
			stateStore,
		});

		await this._stateMachine.executeGenesisBlock(blockCtx);

		const smtStore = new SMTStore(new InMemoryKVStore());
		const smt = new SparseMerkleTree({ db: smtStore });
		await stateStore.finalize(db.batch(), smt);

		const apiContext = createAPIContext({ stateStore, eventQueue });
		const bftParams = await this._bftAPI.getBFTParameters(apiContext, height + 1);
		header.stateRoot = smt.rootHash;

		const blockEvents = blockCtx.eventQueue.getEvents();
		const eventSmtStore = new SMTStore(new InMemoryKVStore());
		const eventSMT = new SparseMerkleTree({
			db: eventSmtStore,
			keyLength: EVENT_KEY_LENGTH,
		});
		for (const e of blockEvents) {
			const pairs = e.keyPair();
			for (const pair of pairs) {
				await eventSMT.update(pair.key, pair.value);
			}
		}
		header.eventRoot = eventSMT.rootHash;
		header.validatorsHash = bftParams.validatorsHash;

		return new Block(header, [], assets);
	}

	public async generateBlock(input: BlockGenerateInput): Promise<Block> {
		const block = await this._generateBlock({
			...input,
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

	private async _verifyTransaction(transactions: Transaction[]): Promise<void> {
		const stateStore = new StateStore(this._blockchainDB);
		const eventQueue = new EventQueue();
		for (const transaction of transactions) {
			const txContext = new TransactionContext({
				eventQueue,
				logger: this._logger,
				networkIdentifier: this._chain.networkIdentifier,
				stateStore,
				transaction,
			});
			const result = await this._stateMachine.verifyTransaction(txContext);
			if (result.status === VerifyStatus.FAIL) {
				throw new Error('Invalid transaction');
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async _loadGenerators(): Promise<void> {
		const encryptedList = this._config.generators;

		if (
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			!encryptedList?.length ||
			!this._config.force ||
			!this._config.defaultPassword
		) {
			return;
		}
		this._logger.info(
			`Loading ${encryptedList.length} delegates using encrypted passphrases from config`,
		);

		for (const encryptedItem of encryptedList) {
			let passphrase;
			try {
				passphrase = decryptPassphraseWithPassword(
					parseEncryptedPassphrase(encryptedItem.encryptedPassphrase),
					this._config.defaultPassword,
				);
			} catch (error) {
				const decryptionError = `Invalid encryptedPassphrase for address: ${
					encryptedItem.address
				}. ${(error as Error).message}`;
				this._logger.error(decryptionError);
				throw new Error(decryptionError);
			}

			const keypair = getPrivateAndPublicKeyFromPassphrase(passphrase);
			const delegateAddress = getAddressFromPublicKey(keypair.publicKey);
			const blsSK = generatePrivateKey(Buffer.from(passphrase, 'utf-8'));

			if (!delegateAddress.equals(Buffer.from(encryptedItem.address, 'hex'))) {
				throw new Error(
					`Invalid encryptedPassphrase for address: ${encryptedItem.address}. Address do not match`,
				);
			}

			const validatorAddress = getAddressFromPublicKey(keypair.publicKey);

			this._keypairs.set(validatorAddress, {
				...keypair,
				blsSecretKey: blsSK,
			});
			this._logger.info(`Forging enabled on account: ${validatorAddress.toString('hex')}`);
		}
	}

	/**
	 * Loads transactions from the network:
	 * - Validates each transaction from the network and applies a penalty if invalid.
	 * - Calls processUnconfirmedTransaction for each transaction.
	 */
	private async _getUnconfirmedTransactionsFromNetwork(): Promise<void> {
		this._logger.info('Loading transactions from the network');

		const { data } = ((await this._network.request({
			procedure: NETWORK_RPC_GET_TRANSACTIONS,
		})) as unknown) as {
			data: Buffer;
		};
		const encodedData = codec.decode<GetTransactionResponse>(getTransactionsResponseSchema, data);

		const validatorErrors = validator.validate(getTransactionsResponseSchema, encodedData);
		if (validatorErrors.length) {
			throw new LiskValidationError(validatorErrors);
		}

		const transactions = encodedData.transactions.map(transaction =>
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
		const apiContext = createNewAPIContext(this._blockchainDB);

		const MS_IN_A_SEC = 1000;
		const currentTime = Math.floor(new Date().getTime() / MS_IN_A_SEC);
		const currentSlot = await this._validatorAPI.getSlotNumber(apiContext, currentTime);

		const currentSlotTime = await this._validatorAPI.getSlotTime(apiContext, currentSlot);

		const { waitThreshold } = this._config;
		const lastBlockSlot = await this._validatorAPI.getSlotNumber(
			apiContext,
			this._chain.lastBlock.header.timestamp,
		);

		if (currentSlot === lastBlockSlot) {
			this._logger.trace({ slot: currentSlot }, 'Block already forged for the current slot');
			return;
		}

		const generator = await this._validatorAPI.getGeneratorAtTimestamp(apiContext, currentTime);
		const validatorKeypair = this._keypairs.get(generator);

		if (validatorKeypair === undefined) {
			this._logger.debug({ currentSlot }, 'Waiting for delegate slot');
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
			height: this._chain.lastBlock.header.height + 1,
			generatorAddress: generator,
			privateKey: validatorKeypair.privateKey,
			timestamp: currentTime,
		});
		this._logger.info(
			{
				id: generatedBlock.header.id,
				height: generatedBlock.header.height,
				generatorAddress: generator.toString('hex'),
			},
			'Generated new block',
		);

		await this._consensus.execute(generatedBlock as never);
	}

	private async _generateBlock(input: BlockGenerateInput): Promise<Block> {
		const { generatorAddress, timestamp, privateKey, height } = input;
		const stateStore = new StateStore(this._blockchainDB);
		const generatorStore = new GeneratorStore(input.db ?? this._generatorDB);
		const apiContext = createAPIContext({ stateStore, eventQueue: new EventQueue() });

		const { maxHeightPrevoted } = await this._bftAPI.getBFTHeights(apiContext);
		const { height: maxHeightGenerated } = await getOrDefaultLastGeneratedInfo(
			generatorStore,
			generatorAddress,
		);

		const blockHeader = new BlockHeader({
			generatorAddress,
			height,
			previousBlockID: this._chain.lastBlock.header.id,
			version: BLOCK_VERSION,
			maxHeightPrevoted,
			maxHeightGenerated,
			aggregateCommit: {
				height: 0,
				aggregationBits: Buffer.alloc(0),
				certificateSignature: Buffer.alloc(0),
			},
			timestamp,
		});
		const blockAssets = new BlockAssets();

		const genContext = new GenerationContext({
			generatorStore,
			header: blockHeader,
			assets: blockAssets,
			logger: this._logger,
			networkIdentifier: this._chain.networkIdentifier,
			stateStore,
			finalizedHeight: this._chain.finalizedHeight,
		});

		for (const mod of this._modules) {
			if (!mod.initBlock) {
				continue;
			}
			await mod.initBlock(genContext.getBlockGenerateContext());
		}
		const eventQueue = new EventQueue();
		const blockCtx = new BlockContext({
			eventQueue,
			header: blockHeader,
			assets: blockAssets,
			logger: this._logger,
			networkIdentifier: this._chain.networkIdentifier,
			stateStore,
		});
		await this._stateMachine.beforeExecuteBlock(blockCtx);

		// Execute transactions
		const transactions =
			input.transactions ?? (await this._forgingStrategy.getTransactionsForBlock(blockHeader));

		blockCtx.setTransactions(transactions);
		for (const tx of transactions) {
			const txContext = blockCtx.getTransactionContext(tx);
			const verifyResult = await this._stateMachine.verifyTransaction(txContext);
			if (verifyResult.status !== VerifyStatus.OK) {
				if (verifyResult.error) {
					this._logger.info({ err: verifyResult.error }, 'Transaction verification failed');
					throw verifyResult.error;
				}
				throw new Error(`Transaction verification failed. ID ${tx.id.toString('hex')}.`);
			}
			await this._stateMachine.executeTransaction(txContext);
		}

		await this._stateMachine.afterExecuteBlock(blockCtx);

		for (const mod of this._modules) {
			if (!mod.sealBlock) {
				continue;
			}
			await mod.sealBlock(genContext.getBlockGenerateContext());
		}
		// Create SMT Store to now update SMT by calling finalize
		const smtStore = new SMTStore(this._blockchainDB);
		const smt = new SparseMerkleTree({
			db: smtStore,
			rootHash: this._chain.lastBlock.header.stateRoot,
		});
		await stateStore.finalize(this._blockchainDB.batch(), smt);

		// calculate transaction root
		const txTree = new MerkleTree();
		await txTree.init(transactions.map(tx => tx.id));
		const transactionRoot = txTree.root;
		blockHeader.transactionRoot = transactionRoot;
		blockHeader.assetsRoot = await blockAssets.getRoot();
		// Assign root hash calculated in SMT to state root of block header
		blockHeader.stateRoot = smt.rootHash;

		// Add event root calculation
		const blockEvents = blockCtx.eventQueue.getEvents();
		const eventSmtStore = new SMTStore(new InMemoryKVStore());
		const eventSMT = new SparseMerkleTree({
			db: eventSmtStore,
			keyLength: EVENT_KEY_LENGTH,
		});
		for (const e of blockEvents) {
			const pairs = e.keyPair();
			for (const pair of pairs) {
				await eventSMT.update(pair.key, pair.value);
			}
		}
		blockHeader.eventRoot = eventSMT.rootHash;

		// Set validatorsHash
		const { validatorsHash } = await this._bftAPI.getBFTParameters(apiContext, height + 1);
		blockHeader.validatorsHash = validatorsHash;
		blockHeader.aggregateCommit = await this._consensus.getAggregateCommit(apiContext);
		blockHeader.sign(this._chain.networkIdentifier, privateKey);

		const generatedBlock = new Block(blockHeader, transactions, blockAssets);

		await setLastGeneratedInfo(generatorStore, blockHeader.generatorAddress, blockHeader);

		const batch = this._generatorDB.batch();
		generatorStore.finalize(batch);
		await batch.write();

		return generatedBlock;
	}

	private _handleFinalizedHeightChanged(from: number, to: number): Promise<void>[] {
		const promises = [];
		const apiContext = createNewAPIContext(this._blockchainDB);
		for (const [address, pairs] of this._keypairs.entries()) {
			for (let height = from + 1; height <= to; height += 1) {
				promises.push(
					this._certifySingleCommitForChangedHeight(
						apiContext,
						height,
						address,
						pairs.blsSecretKey,
					),
				);
			}
			promises.push(
				this._certifySingleCommitForFinalizedHeight(apiContext, to, address, pairs.blsSecretKey),
			);
		}
		return promises;
	}

	private async _certifySingleCommitForChangedHeight(
		apiContext: APIContext,
		height: number,
		generatorAddress: Buffer,
		blsSK: Buffer,
	): Promise<void> {
		const paramExist = await this._bftAPI.existBFTParameters(apiContext, height + 1);
		if (!paramExist) {
			return;
		}
		await this._certifySingleCommit(apiContext, height, generatorAddress, blsSK);
	}

	private async _certifySingleCommitForFinalizedHeight(
		apiContext: APIContext,
		height: number,
		generatorAddress: Buffer,
		blsSK: Buffer,
	): Promise<void> {
		const paramExist = await this._bftAPI.existBFTParameters(apiContext, height + 1);
		if (paramExist) {
			return;
		}
		await this._certifySingleCommit(apiContext, height, generatorAddress, blsSK);
	}

	private async _certifySingleCommit(
		apiContext: APIContext,
		height: number,
		generatorAddress: Buffer,
		blsSK: Buffer,
	): Promise<void> {
		const params = await this._bftAPI.getBFTParameters(apiContext, height);
		const isActive = params.validators.find(v => v.address.equals(generatorAddress)) !== undefined;
		if (!isActive) {
			return;
		}

		const blockHeader = await this._chain.dataAccess.getBlockHeaderByHeight(height);
		const validatorInfo = {
			address: generatorAddress,
			blsPublicKey: getPublicKeyFromPrivateKey(blsSK),
			blsSecretKey: blsSK,
		};
		this._consensus.certifySingleCommit(blockHeader, validatorInfo);
	}
}
