/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/*
 * Copyright © 2019 Lisk Foundation
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
	decryptPassphraseWithPassword,
	generateHashOnionSeed,
	getAddressFromPublicKey,
	getPrivateAndPublicKeyFromPassphrase,
	hashOnion,
	parseEncryptedPassphrase,
	signDataWithPrivateKey,
	hash,
} from '@liskhq/lisk-cryptography';
import { Chain, Block, Transaction, BlockHeader } from '@liskhq/lisk-chain';
import { BFT } from '@liskhq/lisk-bft';
import { MerkleTree } from '@liskhq/lisk-tree';
import { dataStructures } from '@liskhq/lisk-utils';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { KVStore } from '@liskhq/lisk-db';
import { HighFeeForgingStrategy } from './strategies';
import { Processor } from '../processor';
import { Logger } from '../../logger';
import {
	getRegisteredHashOnionSeeds,
	getUsedHashOnions,
	setRegisteredHashOnionSeeds,
	setUsedHashOnions,
	UsedHashOnion,
	saveMaxHeightPreviouslyForged,
	getPreviouslyForgedMap,
} from './data_access';

interface HashOnionConfig {
	readonly count: number;
	readonly distance: number;
	readonly hashes: Buffer[];
}

export interface ForgingStatus {
	readonly address: Buffer;
	readonly forging: boolean;
}

interface Keypair {
	publicKey: Buffer;
	privateKey: Buffer;
}

export interface RegisteredDelegate {
	readonly address: Buffer;
	readonly encryptedPassphrase: string;
	readonly hashOnion: {
		readonly count: number;
		readonly distance: number;
		readonly hashes: Buffer[];
	};
}

interface ForgerConstructor {
	readonly forgingStrategy?: HighFeeForgingStrategy;
	readonly logger: Logger;
	readonly db: KVStore;
	readonly processorModule: Processor;
	readonly bftModule: BFT;
	readonly transactionPoolModule: TransactionPool;
	readonly chainModule: Chain;
	readonly forgingDelegates?: ReadonlyArray<RegisteredDelegate>;
	readonly forgingForce?: boolean;
	readonly forgingDefaultPassword?: string;
	readonly forgingWaitThreshold: number;
}

interface CreateBlockInput {
	readonly keypair: { publicKey: Buffer; privateKey: Buffer };
	readonly timestamp: number;
	readonly transactions: Transaction[];
	readonly previousBlock: Block;
	readonly seedReveal: Buffer;
}

const BLOCK_VERSION = 2;

export class Forger {
	private readonly _logger: Logger;
	private readonly _db: KVStore;
	private readonly _processorModule: Processor;
	private readonly _bftModule: BFT;
	private readonly _transactionPoolModule: TransactionPool;
	private readonly _chainModule: Chain;
	private readonly _keypairs: dataStructures.BufferMap<Keypair>;
	private readonly _config: {
		readonly forging: {
			readonly force?: boolean;
			delegates?: ReadonlyArray<RegisteredDelegate>;
			readonly defaultPassword?: string;
			readonly waitThreshold: number;
		};
	};
	private readonly _forgingStrategy: HighFeeForgingStrategy;

	public constructor({
		forgingStrategy,
		logger,
		db,
		// Modules
		processorModule,
		bftModule,
		transactionPoolModule,
		chainModule,
		// constants
		forgingDelegates,
		forgingForce,
		forgingDefaultPassword,
		forgingWaitThreshold,
	}: ForgerConstructor) {
		this._keypairs = new dataStructures.BufferMap<Keypair>();
		this._logger = logger;
		this._db = db;
		this._config = {
			forging: {
				delegates: forgingDelegates,
				force: forgingForce,
				defaultPassword: forgingDefaultPassword,
				waitThreshold: forgingWaitThreshold,
			},
		};

		this._processorModule = processorModule;
		this._bftModule = bftModule;
		this._transactionPoolModule = transactionPoolModule;
		this._chainModule = chainModule;

		this._forgingStrategy =
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			forgingStrategy ??
			new HighFeeForgingStrategy({
				transactionPoolModule: this._transactionPoolModule,
				chainModule: this._chainModule,
				maxPayloadLength: this._chainModule.constants.maxPayloadLength,
				processorModule: this._processorModule,
			});
	}

	public delegatesEnabled(): boolean {
		return this._keypairs.values().length > 0;
	}

	public async updateForgingStatus(
		forgerAddress: Buffer,
		password: string,
		forging: boolean,
	): Promise<ForgingStatus> {
		const encryptedList = this._config.forging.delegates;
		const encryptedItem = encryptedList?.find(item => item.address.equals(forgerAddress));

		let keypair: Keypair;
		let passphrase: string;

		if (encryptedItem) {
			try {
				passphrase = decryptPassphraseWithPassword(
					parseEncryptedPassphrase(encryptedItem.encryptedPassphrase),
					password,
				);
			} catch (e) {
				throw new Error('Invalid password and public key combination');
			}

			keypair = getPrivateAndPublicKeyFromPassphrase(passphrase);
		} else {
			throw new Error(`Delegate with address: ${forgerAddress.toString('base64')} not found`);
		}

		if (!getAddressFromPublicKey(keypair.publicKey).equals(forgerAddress)) {
			throw new Error(
				`Invalid keypair: ${getAddressFromPublicKey(keypair.publicKey).toString(
					'base64',
				)}  and address: ${forgerAddress.toString('base64')} combination`,
			);
		}

		const account = await this._chainModule.dataAccess.getAccountByAddress(forgerAddress);

		if (forging) {
			this._keypairs.set(forgerAddress, keypair);
			this._logger.info(`Forging enabled on account: ${account.address.toString('base64')}`);
		} else {
			this._keypairs.delete(forgerAddress);
			this._logger.info(`Forging disabled on account: ${account.address.toString('base64')}`);
		}

		return {
			address: forgerAddress,
			forging,
		};
	}

	public async loadDelegates(): Promise<void> {
		const encryptedList = this._config.forging.delegates;

		if (
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			!encryptedList?.length ||
			!this._config.forging.force ||
			!this._config.forging.defaultPassword
		) {
			return;
		}
		this._logger.info(
			`Loading ${encryptedList.length} delegates using encrypted passphrases from config`,
		);

		let usedHashOnions = await getUsedHashOnions(this._db);
		const registeredHashOnionSeeds = await getRegisteredHashOnionSeeds(this._db);

		for (const encryptedItem of encryptedList) {
			let passphrase;
			try {
				passphrase = decryptPassphraseWithPassword(
					parseEncryptedPassphrase(encryptedItem.encryptedPassphrase),
					this._config.forging.defaultPassword,
				);
			} catch (error) {
				const decryptionError = `Invalid encryptedPassphrase for address: ${encryptedItem.address.toString(
					'base64',
				)}. ${(error as Error).message}`;
				this._logger.error(decryptionError);
				throw new Error(decryptionError);
			}

			const keypair = getPrivateAndPublicKeyFromPassphrase(passphrase);
			const delegateAddress = getAddressFromPublicKey(keypair.publicKey);

			if (!delegateAddress.equals(encryptedItem.address)) {
				throw new Error(
					`Invalid encryptedPassphrase for address: ${encryptedItem.address.toString(
						'base64',
					)}. Address do not match`,
				);
			}

			const validatorAddress = getAddressFromPublicKey(keypair.publicKey);
			const account = await this._chainModule.dataAccess.getAccountByAddress(validatorAddress);

			this._keypairs.set(validatorAddress, keypair);
			this._logger.info(`Forging enabled on account: ${account.address.toString('base64')}`);
			// Prepare hash-onion
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const registeredHashOnionSeed = registeredHashOnionSeeds.get(account.address);
			const hashOnionConfig = this._getHashOnionConfig(account.address);

			// If hash onion in the config is different from what is registered, remove all the used information and register the new one
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const configHashOnionSeed = hashOnionConfig.hashes[hashOnionConfig.hashes.length - 1];
			if (registeredHashOnionSeed && !registeredHashOnionSeed.equals(configHashOnionSeed)) {
				this._logger.warn(
					`Hash onion for Account ${account.address.toString(
						'base64',
					)} is not the same as previous one. Overwriting with new hash onion`,
				);
				usedHashOnions = usedHashOnions.filter(ho => !ho.address.equals(account.address));
			}
			// Update the registered hash onion (either same one, new one or overwritten one)
			registeredHashOnionSeeds.set(account.address, configHashOnionSeed);
			const highestUsedHashOnion = usedHashOnions.reduce<UsedHashOnion | undefined>(
				(prev, current) => {
					if (!current.address.equals(account.address)) {
						return prev;
					}
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (!prev || prev.count < current.count) {
						return current;
					}
					return prev;
				},
				undefined,
			);

			// If there are no previous usage, no need to check further
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (!highestUsedHashOnion) {
				// eslint-disable-next-line no-continue
				continue;
			}
			// If hash onion used is close to being used up, then put the warning message
			const { count: highestCount } = highestUsedHashOnion;
			if (highestCount > hashOnionConfig.count - hashOnionConfig.distance) {
				this._logger.warn(
					{
						hashOnionUsed: highestCount,
					},
					`Number of hashonion used(${highestCount}) is close to end. Please update to the new hash onion`,
				);
			}
			// If all hash onion is used, throw an error
			if (highestCount >= hashOnionConfig.count) {
				throw new Error(`All of the hash onion is used for ${account.address.toString('base64')}`);
			}
		}
		await setRegisteredHashOnionSeeds(this._db, registeredHashOnionSeeds);
		await setUsedHashOnions(this._db, usedHashOnions);
	}

	public async forge(): Promise<void> {
		const MS_IN_A_SEC = 1000;
		const currentSlot = this._chainModule.slots.getSlotNumber();

		const currentSlotTime = this._chainModule.slots.getSlotTime(currentSlot);

		const currentTime = Math.floor(new Date().getTime() / MS_IN_A_SEC);

		const { waitThreshold } = this._config.forging;
		const { lastBlock } = this._chainModule;
		const lastBlockSlot = this._chainModule.slots.getSlotNumber(lastBlock.header.timestamp);

		if (currentSlot === lastBlockSlot) {
			this._logger.trace({ slot: currentSlot }, 'Block already forged for the current slot');
			return;
		}

		const validator = await this._chainModule.getValidator(currentTime);
		const validatorKeypair = this._keypairs.get(validator.address);

		if (validatorKeypair === undefined) {
			this._logger.trace(
				{ currentSlot: this._chainModule.slots.getSlotNumber() },
				'Waiting for delegate slot',
			);
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

		const timestamp = currentSlotTime;

		const previousBlock = this._chainModule.lastBlock;
		const transactions = await this._forgingStrategy.getTransactionsForBlock();

		const delegateAddress = getAddressFromPublicKey(validatorKeypair.publicKey);
		const nextHeight = previousBlock.header.height + 1;

		const usedHashOnions = await getUsedHashOnions(this._db);
		const nextHashOnion = this._getNextHashOnion(usedHashOnions, delegateAddress, nextHeight);
		const index = usedHashOnions.findIndex(
			ho => ho.address.equals(delegateAddress) && ho.count === nextHashOnion.count,
		);
		const nextUsedHashOnion = {
			count: nextHashOnion.count,
			address: delegateAddress,
			height: nextHeight,
		} as UsedHashOnion;
		if (index > -1) {
			// Overwrite the hash onion if it exists
			usedHashOnions[index] = nextUsedHashOnion;
		} else {
			usedHashOnions.push(nextUsedHashOnion);
		}

		const updatedUsedHashOnion = this._filterUsedHashOnions(
			usedHashOnions,
			this._bftModule.finalizedHeight,
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const forgedBlock = await this._create({
			keypair: validatorKeypair,
			timestamp,
			transactions,
			previousBlock,
			seedReveal: nextHashOnion.hash,
		});

		await setUsedHashOnions(this._db, updatedUsedHashOnion);

		await this._processorModule.process(forgedBlock);

		this._logger.info(
			{
				id: forgedBlock.header.id,
				generatorAddress: delegateAddress,
				seedReveal: nextHashOnion.hash,
				height: forgedBlock.header.height,
				slot: this._chainModule.slots.getSlotNumber(forgedBlock.header.timestamp),
				reward: forgedBlock.header.reward.toString(),
			},
			'Forged new block',
		);
	}

	public getForgersKeyPairs(): dataStructures.BufferMap<Keypair> {
		return this._keypairs;
	}

	// eslint-disable-next-line class-methods-use-this
	public getForgingStatusOfAllDelegates(): ForgingStatus[] | undefined {
		const forgingDelegates = this._config.forging.delegates;
		const forgersAddress = new dataStructures.BufferSet();

		for (const keypair of this._keypairs.values()) {
			forgersAddress.add(getAddressFromPublicKey(keypair.publicKey));
		}

		const fullList = forgingDelegates?.map(forger => ({
			forging: forgersAddress.has(forger.address),
			address: forger.address,
		}));

		return fullList;
	}

	private _getNextHashOnion(
		usedHashOnions: ReadonlyArray<UsedHashOnion>,
		address: Buffer,
		height: number,
	): {
		readonly count: number;
		readonly hash: Buffer;
	} {
		// Get highest hashonion that is used by this address below height
		const usedHashOnion = usedHashOnions.reduce<UsedHashOnion | undefined>((prev, current) => {
			if (!current.address.equals(address)) {
				return prev;
			}
			if (
				current.height < height &&
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				(!prev || prev.height < current.height)
			) {
				return current;
			}
			return prev;
		}, undefined);
		const hashOnionConfig = this._getHashOnionConfig(address);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!usedHashOnion) {
			return {
				hash: hashOnionConfig.hashes[0],
				count: 0,
			};
		}
		const { count: usedCount } = usedHashOnion;
		const nextCount = usedCount + 1;
		if (nextCount > hashOnionConfig.count) {
			this._logger.warn(
				'All of the hash onion has been used already. Please update to the new hash onion.',
			);
			return {
				hash: generateHashOnionSeed(),
				count: 0,
			};
		}
		const nextCheckpointIndex = Math.ceil(nextCount / hashOnionConfig.distance);
		const nextCheckpoint = hashOnionConfig.hashes[nextCheckpointIndex];
		const hashes = hashOnion(nextCheckpoint, hashOnionConfig.distance, 1);
		const checkpointIndex = nextCount % hashOnionConfig.distance;
		return {
			hash: hashes[checkpointIndex],
			count: nextCount,
		};
	}

	private _getHashOnionConfig(address: Buffer): HashOnionConfig {
		const delegateConfig = this._config.forging.delegates?.find(d => d.address.equals(address));
		if (!delegateConfig?.hashOnion) {
			throw new Error(
				`Account ${address.toString('base64')} does not have hash onion in the config`,
			);
		}

		return delegateConfig.hashOnion;
	}

	// eslint-disable-next-line class-methods-use-this
	private _filterUsedHashOnions(
		usedHashOnions: UsedHashOnion[],
		finalizedHeight: number,
	): UsedHashOnion[] {
		const filteredObject = usedHashOnions.reduce(
			({ others, highest }, current) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const prevUsed = highest.get(current.address);
				if (prevUsed === undefined) {
					highest.set(current.address, current);
				} else if (prevUsed.height < current.height) {
					others.push(prevUsed);
					highest.set(current.address, current);
				}
				return {
					highest,
					others,
				};
			},
			{
				others: [] as UsedHashOnion[],
				highest: new dataStructures.BufferMap<UsedHashOnion>(),
			},
		);

		const filtered = filteredObject.others.filter(ho => ho.height > finalizedHeight);
		return filtered.concat(filteredObject.highest.values());
	}

	private async _create({
		transactions,
		keypair,
		seedReveal,
		timestamp,
		previousBlock,
	}: CreateBlockInput): Promise<Block> {
		const previouslyForgedMap = await getPreviouslyForgedMap(this._db);
		const delegateAddress = getAddressFromPublicKey(keypair.publicKey);
		const height = previousBlock.header.height + 1;
		const previousBlockID = previousBlock.header.id;
		const forgerInfo = previouslyForgedMap.get(delegateAddress);
		const maxHeightPreviouslyForged = forgerInfo?.height ?? 0;
		const maxHeightPrevoted = await this._bftModule.getMaxHeightPrevoted();
		const stateStore = await this._chainModule.newStateStore();
		const reward = this._chainModule.calculateReward(height);
		let size = 0;

		const blockTransactions = [];
		const transactionIds = [];

		for (const transaction of transactions) {
			const transactionBytes = transaction.getBytes();

			if (size + transactionBytes.length > this._chainModule.constants.maxPayloadLength) {
				break;
			}

			size += transactionBytes.length;
			blockTransactions.push(transaction);
			transactionIds.push(transaction.id);
		}

		const transactionRoot = new MerkleTree(transactionIds).root;

		const header = {
			version: BLOCK_VERSION,
			height,
			reward,
			transactionRoot,
			previousBlockID,
			timestamp,
			generatorPublicKey: keypair.publicKey,
			asset: {
				seedReveal,
				maxHeightPreviouslyForged,
				maxHeightPrevoted,
			},
		};

		const isBFTProtocolCompliant = await this._bftModule.isBFTProtocolCompliant(
			header as BlockHeader,
			stateStore,
		);

		// Reduce reward based on BFT rules
		if (!isBFTProtocolCompliant) {
			header.reward /= BigInt(4);
		}

		header.reward = this._chainModule.isValidSeedReveal(header as BlockHeader, stateStore)
			? reward
			: BigInt(0);

		const headerBytesWithoutSignature = this._chainModule.dataAccess.encodeBlockHeader(
			header as BlockHeader,
			true,
		);
		const signature = signDataWithPrivateKey(
			Buffer.concat([this._chainModule.constants.networkIdentifier, headerBytesWithoutSignature]),
			keypair.privateKey,
		);
		const headerBytes = this._chainModule.dataAccess.encodeBlockHeader({
			...header,
			signature,
		} as BlockHeader);
		const id = hash(headerBytes);

		const block = {
			header: {
				...header,
				signature,
				id,
			},
			payload: blockTransactions,
		};

		await saveMaxHeightPreviouslyForged(this._db, block.header, previouslyForgedMap);
		return block;
	}
}
