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
	getPrivateAndPublicKeyBytesFromPassphrase,
	decryptPassphraseWithPassword,
	parseEncryptedPassphrase,
	hashOnion,
	generateHashOnionSeed,
	getAddressFromPublicKey,
} from '@liskhq/lisk-cryptography';
import { Account, Chain, BlockInstance } from '@liskhq/lisk-chain';
import { Dpos } from '@liskhq/lisk-dpos';
import { BFT } from '@liskhq/lisk-bft';
import { BaseTransaction } from '@liskhq/lisk-transactions';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import {
	FORGER_INFO_KEY_USED_HASH_ONION,
	FORGER_INFO_KEY_REGISTERED_HASH_ONION_SEEDS,
} from './constant';
import { HighFeeForgingStrategy } from './strategies';
import { Logger, Storage, StringKeyVal } from '../../../types';

interface UsedHashOnion {
	readonly count: number;
	readonly address: string;
	readonly height: number;
	readonly hash?: string;
}

interface DelegateConfig {
	readonly publicKey: string;
	readonly encryptedPassphrase: string;
	readonly hashOnion: HashOnionConfig;
}

interface HashOnionConfig {
	readonly count: number;
	readonly distance: number;
	readonly hashes: string[];
}

interface KeyPair {
	[key: string]: Buffer;
}

interface KeyPairs {
	[key: string]: KeyPair;
}

interface ProcessorModule {
	readonly create: (input: {
		readonly keypair: KeyPair;
		readonly timestamp: number;
		transactions: BaseTransaction[];
		readonly previousBlock: BlockInstance;
		readonly seedReveal: string;
	}) => Promise<BlockInstance>;
	readonly process: (block: BlockInstance) => Promise<void>;
}

interface ForgerConstructor {
	readonly forgingStrategy: HighFeeForgingStrategy;
	readonly logger: Logger;
	readonly storage: Storage;
	readonly processorModule: ProcessorModule;
	readonly dposModule: Dpos;
	readonly bftModule: BFT;
	readonly transactionPoolModule: TransactionPool;
	readonly chainModule: Chain;
	readonly maxPayloadLength: number;
	readonly forgingDelegates: ReadonlyArray<DelegateConfig>;
	readonly forgingForce: boolean;
	readonly forgingDefaultPassword: string;
	readonly forgingWaitThreshold: number;
}

export class Forger {
	private readonly logger: Logger;
	private readonly storage: Storage;
	private readonly processorModule: ProcessorModule;
	private readonly dposModule: Dpos;
	private readonly bftModule: BFT;
	private readonly transactionPoolModule: TransactionPool;
	private readonly chainModule: Chain;
	private readonly keypairs: KeyPairs;
	private readonly config: {
		readonly forging: {
			readonly force: boolean;
			delegates: ReadonlyArray<DelegateConfig>;
			readonly defaultPassword: string;
			readonly waitThreshold: number;
		};
	};
	private readonly constants: {
		readonly maxPayloadLength: number;
	};
	private readonly forgingStrategy: HighFeeForgingStrategy;

	public constructor({
		forgingStrategy,
		// components
		logger,
		storage,
		// Modules
		processorModule,
		dposModule,
		bftModule,
		transactionPoolModule,
		chainModule,
		// constants
		maxPayloadLength,
		forgingDelegates,
		forgingForce,
		forgingDefaultPassword,
		forgingWaitThreshold,
	}: ForgerConstructor) {
		this.keypairs = {};
		this.logger = logger;
		this.storage = storage;
		this.config = {
			forging: {
				delegates: forgingDelegates,
				force: forgingForce,
				defaultPassword: forgingDefaultPassword,
				waitThreshold: forgingWaitThreshold,
			},
		};
		this.constants = {
			maxPayloadLength,
		};

		this.processorModule = processorModule;
		this.dposModule = dposModule;
		this.bftModule = bftModule;
		this.transactionPoolModule = transactionPoolModule;
		this.chainModule = chainModule;

		this.forgingStrategy =
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			forgingStrategy ??
			new HighFeeForgingStrategy({
				transactionPoolModule: this.transactionPoolModule,
				chainModule: this.chainModule,
				maxPayloadLength: this.constants.maxPayloadLength,
			});
	}

	public delegatesEnabled(): boolean {
		return Object.keys(this.keypairs).length > 0;
	}

	public async updateForgingStatus(
		publicKey: string,
		password: string,
		forging: boolean,
	): Promise<{ readonly publicKey: string; readonly forging: boolean }> {
		const encryptedList = this.config.forging.delegates;
		const encryptedItem = encryptedList.find(
			item => item.publicKey === publicKey,
		);

		let keypair: KeyPair;
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
			const {
				publicKeyBytes,
				privateKeyBytes,
			} = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);

			keypair = {
				publicKey: publicKeyBytes,
				privateKey: privateKeyBytes,
			};
		} else {
			throw new Error(`Delegate with publicKey: ${publicKey} not found`);
		}

		if (keypair.publicKey.toString('hex') !== publicKey) {
			throw new Error('Invalid password and public key combination');
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const [
			account,
		]: Account[] = await this.chainModule.dataAccess.getAccountsByPublicKey([
			keypair.publicKey.toString('hex'),
		]);

		if (account.isDelegate) {
			if (forging) {
				this.keypairs[
					getAddressFromPublicKey(keypair.publicKey.toString('hex'))
				] = keypair;
				this.logger.info(`Forging enabled on account: ${account.address}`);
			} else {
				delete this.keypairs[
					getAddressFromPublicKey(keypair.publicKey.toString('hex'))
				];
				this.logger.info(`Forging disabled on account: ${account.address}`);
			}

			return {
				publicKey,
				forging,
			};
		}
		throw new Error('Delegate not found');
	}

	public async loadDelegates(): Promise<void> {
		const encryptedList = this.config.forging.delegates;

		if (
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			!encryptedList?.length ||
			!this.config.forging.force ||
			!this.config.forging.defaultPassword
		) {
			return;
		}
		this.logger.info(
			`Loading ${encryptedList.length} delegates using encrypted passphrases from config`,
		);

		let usedHashOnions = await this._getUsedHashOnions();
		const registeredHashOnionSeeds = await this._getRegisteredHashOnionSeeds();

		for (const encryptedItem of encryptedList) {
			let passphrase;
			try {
				passphrase = decryptPassphraseWithPassword(
					parseEncryptedPassphrase(encryptedItem.encryptedPassphrase),
					this.config.forging.defaultPassword,
				);
			} catch (error) {
				const decryptionError = `Invalid encryptedPassphrase for publicKey: ${
					encryptedItem.publicKey
				}. ${(error as Error).message}`;
				this.logger.error(decryptionError);
				throw new Error(decryptionError);
			}

			const {
				publicKeyBytes,
				privateKeyBytes,
			} = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);

			const keypair = {
				publicKey: publicKeyBytes,
				privateKey: privateKeyBytes,
			};

			if (keypair.publicKey.toString('hex') !== encryptedItem.publicKey) {
				throw new Error(
					`Invalid encryptedPassphrase for publicKey: ${encryptedItem.publicKey}. Public keys do not match`,
				);
			}

			const [
				account,
			]: Account[] = await this.chainModule.dataAccess.getAccountsByPublicKey([
				keypair.publicKey.toString('hex'),
			]);

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (!account) {
				throw new Error(
					`Account with public key: ${keypair.publicKey.toString(
						'hex',
					)} not found`,
				);
			}
			if (account.isDelegate) {
				this.keypairs[
					getAddressFromPublicKey(keypair.publicKey.toString('hex'))
				] = keypair;
				this.logger.info(`Forging enabled on account: ${account.address}`);
			} else {
				this.logger.warn(
					{},
					`Account with public key: ${keypair.publicKey.toString(
						'hex',
					)} is not a delegate`,
				);
			}
			// Prepare hash-onion
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const registeredHashOnionSeed = registeredHashOnionSeeds[account.address];
			const hashOnionConfig = this._getHashOnionConfig(account.address);

			// If hash onion in the config is different from what is registered, remove all the used information and register the new one
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const configHashOnionSeed =
				hashOnionConfig.hashes[hashOnionConfig.hashes.length - 1];
			if (
				registeredHashOnionSeed &&
				registeredHashOnionSeed !== configHashOnionSeed
			) {
				this.logger.warn(
					`Hash onion for Account ${account.address} is not the same as previous one. Overwriting with new hash onion`,
				);
				usedHashOnions = usedHashOnions.filter(
					ho => ho.address !== account.address,
				);
			}
			// Update the registered hash onion (either same one, new one or overwritten one)
			registeredHashOnionSeeds[account.address] = configHashOnionSeed;
			const highestUsedHashOnion = usedHashOnions.reduce(
				(prev: UsedHashOnion, current: UsedHashOnion) => {
					if (current.address !== account.address) {
						return prev;
					}
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (!prev || prev.count < current.count) {
						return current;
					}
					return prev;
				},
				{ count: 0, address: '', height: 0 },
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
				this.logger.warn(
					{
						hashOnionUsed: highestCount,
					},
					`Number of hashonion used(${highestCount}) is close to end. Please update to the new hash onion`,
				);
			}
			// If all hash onion is used, throw an error
			if (highestCount >= hashOnionConfig.count) {
				throw new Error(`All of the hash onion is used for ${account.address}`);
			}
		}
		await this._setRegisteredHashOnionSeeds(registeredHashOnionSeeds);
		await this._setUsedHashOnions(usedHashOnions);
	}

	public async forge(): Promise<void> {
		const currentSlot = this.chainModule.slots.getSlotNumber();
		const currentSlotTime = this.chainModule.slots.getRealTime(
			this.chainModule.slots.getSlotTime(currentSlot),
		);

		const currentTime = new Date().getTime();
		const waitThreshold = this.config.forging.waitThreshold * 1000;
		const { lastBlock } = this.chainModule;
		const lastBlockSlot = this.chainModule.slots.getSlotNumber(
			lastBlock.timestamp,
		);

		if (currentSlot === lastBlockSlot) {
			this.logger.trace(
				{ slot: currentSlot },
				'Block already forged for the current slot',
			);
			return;
		}

		// We calculate round using height + 1, because we want the delegate keypair for next block to be forged
		const round = this.dposModule.rounds.calcRound(
			this.chainModule.lastBlock.height + 1,
		);

		let delegateKeypair: KeyPair | null;
		try {
			// eslint-disable-next-line @typescript-eslint/no-use-before-define
			delegateKeypair = await this._getDelegateKeypairForCurrentSlot(
				currentSlot,
				round,
			);
		} catch (err) {
			this.logger.error({ err: err as Error }, 'Skipping delegate slot');
			throw err;
		}

		if (delegateKeypair === null) {
			this.logger.trace(
				{ currentSlot: this.chainModule.slots.getSlotNumber() },
				'Waiting for delegate slot',
			);
			return;
		}

		// If last block slot is way back than one block
		// and still time left as per threshold specified
		if (
			lastBlockSlot < currentSlot - 1 &&
			currentTime <= currentSlotTime + waitThreshold
		) {
			this.logger.info('Skipping forging to wait for last block');
			this.logger.debug(
				{
					currentSlot,
					lastBlockSlot,
					waitThreshold,
				},
				'Slot information',
			);
			return;
		}

		const timestamp = this.chainModule.slots.getSlotTime(currentSlot);
		const previousBlock = this.chainModule.lastBlock;
		const transactions = await this.forgingStrategy.getTransactionsForBlock();

		const delegateAddress = getAddressFromPublicKey(
			delegateKeypair.publicKey.toString('hex'),
		);
		const nextHeight = previousBlock.height + 1;

		const usedHashOnions = await this._getUsedHashOnions();
		const nextHashOnion = this._getNextHashOnion(
			usedHashOnions,
			delegateAddress,
			nextHeight,
		);
		const index = usedHashOnions.findIndex(
			ho => ho.address === delegateAddress && ho.count === nextHashOnion.count,
		);
		const nextUsedHashOnion: UsedHashOnion = {
			count: nextHashOnion.count,
			address: delegateAddress,
			height: nextHeight,
		};
		if (index > -1) {
			// Overwrite the hash onion if it exists
			usedHashOnions[index] = nextUsedHashOnion;
		} else {
			usedHashOnions.push(nextUsedHashOnion);
		}

		const updatedUsedHashOnion = this._filterUsedHashOnions(
			usedHashOnions,
			this.bftModule.finalizedHeight,
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const forgedBlock: BlockInstance = await this.processorModule.create({
			keypair: delegateKeypair,
			timestamp,
			transactions,
			previousBlock,
			seedReveal: nextHashOnion.hash as string,
		});

		await this._setUsedHashOnions(updatedUsedHashOnion);

		await this.processorModule.process(forgedBlock);

		this.logger.info(
			{
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				id: forgedBlock.id,
				generatorAddress: delegateAddress,
				seedReveal: nextHashOnion.hash,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				height: forgedBlock.height,
				round: this.dposModule.rounds.calcRound(forgedBlock.height),
				slot: this.chainModule.slots.getSlotNumber(forgedBlock.timestamp),
				reward: forgedBlock.reward.toString(),
			},
			'Forged new block',
		);
	}

	// eslint-disable-next-line class-methods-use-this
	public getForgersKeyPairs(): KeyPairs {
		return this.keypairs;
	}

	// eslint-disable-next-line class-methods-use-this
	public getForgingStatusOfAllDelegates(): {
		forging: boolean;
		publicKey: string;
	}[] {
		const keyPairs = this.keypairs;
		const forgingDelegates = this.config.forging.delegates;
		const forgersPublicKeys: { [key: string]: boolean } = {};

		Object.keys(keyPairs).forEach(key => {
			forgersPublicKeys[keyPairs[key].publicKey.toString('hex')] = true;
		});

		const fullList = forgingDelegates.map(forger => ({
			forging: !!forgersPublicKeys[forger.publicKey],
			publicKey: forger.publicKey,
		}));

		return fullList;
	}

	private _getNextHashOnion(
		usedHashOnions: ReadonlyArray<UsedHashOnion>,
		address: string,
		height: number,
	): UsedHashOnion {
		// Get highest hashonion that is used by this address below height
		const usedHashOnion = usedHashOnions.reduce(
			(prev: UsedHashOnion, current: UsedHashOnion) => {
				if (current.address !== address) {
					return prev;
				}
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (
					current.height < height &&
					(!prev || prev.height < current.height)
				) {
					return current;
				}
				return prev;
			},
			{ count: 0, address: '', height: 0 },
		);
		const hashOnionConfig = this._getHashOnionConfig(address);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!usedHashOnion) {
			return {
				hash: hashOnionConfig.hashes[0],
				count: 0,
			} as UsedHashOnion;
		}
		const { count: usedCount } = usedHashOnion;
		const nextCount = usedCount + 1;
		if (nextCount > hashOnionConfig.count) {
			this.logger.warn(
				'All of the hash onion has been used already. Please update to the new hash onion.',
			);
			return {
				hash: generateHashOnionSeed().toString('hex'),
				count: 0,
			} as UsedHashOnion;
		}
		const nextCheckpointIndex = Math.ceil(nextCount / hashOnionConfig.distance);
		const nextCheckpoint = Buffer.from(
			hashOnionConfig.hashes[nextCheckpointIndex],
			'hex',
		);
		const hashes = hashOnion(nextCheckpoint, hashOnionConfig.distance, 1);
		const checkpointIndex = nextCount % hashOnionConfig.distance;
		return {
			hash: hashes[checkpointIndex].toString('hex'),
			count: nextCount,
		} as UsedHashOnion;
	}

	private _getHashOnionConfig(address: string): HashOnionConfig {
		const delegateConfig = this.config.forging.delegates.find(
			d => getAddressFromPublicKey(d.publicKey) === address,
		);
		if (!delegateConfig?.hashOnion) {
			throw new Error(
				`Account ${address} does not have hash onion in the config`,
			);
		}
		return delegateConfig.hashOnion;
	}

	private async _getRegisteredHashOnionSeeds(): Promise<StringKeyVal> {
		const registeredHashOnionSeedsStr = await this.storage.entities.ForgerInfo.getKey(
			FORGER_INFO_KEY_REGISTERED_HASH_ONION_SEEDS,
		);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return registeredHashOnionSeedsStr
			? JSON.parse(registeredHashOnionSeedsStr)
			: {};
	}

	private async _setRegisteredHashOnionSeeds(
		registeredHashOnionSeeds: StringKeyVal,
	): Promise<void> {
		const registeredHashOnionSeedsStr = JSON.stringify(
			registeredHashOnionSeeds,
		);
		await this.storage.entities.ForgerInfo.setKey(
			FORGER_INFO_KEY_REGISTERED_HASH_ONION_SEEDS,
			registeredHashOnionSeedsStr,
		);
	}

	private async _getUsedHashOnions(): Promise<UsedHashOnion[]> {
		const usedHashOnionsStr = await this.storage.entities.ForgerInfo.getKey(
			FORGER_INFO_KEY_USED_HASH_ONION,
		);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return usedHashOnionsStr ? JSON.parse(usedHashOnionsStr) : [];
	}

	// eslint-disable-next-line class-methods-use-this
	private _filterUsedHashOnions(
		usedHashOnions: UsedHashOnion[],
		finalizedHeight: number,
	): UsedHashOnion[] {
		const filteredObject = usedHashOnions.reduce(
			({ others, highest }, current) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const prevUsed = highest[current.address];
				if (prevUsed === undefined) {
					// eslint-disable-next-line no-param-reassign
					highest[current.address] = current;
				} else if (prevUsed.height < current.height) {
					others.push(prevUsed);
					// eslint-disable-next-line no-param-reassign
					highest[current.address] = current;
				}
				return {
					highest,
					others,
				};
			},
			{
				others: [] as UsedHashOnion[],
				highest: {} as { [key: string]: UsedHashOnion },
			},
		);

		const filtered = filteredObject.others.filter(
			ho => ho.height > finalizedHeight,
		);
		return filtered.concat(Object.values(filteredObject.highest));
	}

	private async _setUsedHashOnions(
		usedHashOnions: UsedHashOnion[],
	): Promise<void> {
		const usedHashOnionsStr = JSON.stringify(usedHashOnions);
		await this.storage.entities.ForgerInfo.setKey(
			FORGER_INFO_KEY_USED_HASH_ONION,
			usedHashOnionsStr,
		);
	}

	private async _getDelegateKeypairForCurrentSlot(
		currentSlot: number,
		round: number,
	): Promise<KeyPair | null> {
		const activeDelegates = await this.dposModule.getForgerAddressesForRound(
			round,
		);

		const currentSlotIndex = currentSlot % activeDelegates.length;
		const currentSlotDelegate = activeDelegates[currentSlotIndex];

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (currentSlotDelegate && this.keypairs[currentSlotDelegate]) {
			return this.keypairs[currentSlotDelegate];
		}

		return null;
	}
}
