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
} from '@liskhq/lisk-cryptography';
import { BufferMap, Chain } from '@liskhq/lisk-chain';
import { Dpos } from '@liskhq/lisk-dpos';
import { BFT } from '@liskhq/lisk-bft';
import { BaseTransaction } from '@liskhq/lisk-transactions';
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
} from './data_access';
import { DelegateConfig } from '../../../types';

interface HashOnionConfig {
	readonly count: number;
	readonly distance: number;
	readonly hashes: Buffer[];
}

export interface ForgingStatus {
	readonly publicKey: string;
	readonly forging: boolean;
}

interface Keypair {
	publicKey: Buffer;
	privateKey: Buffer;
}

interface ForgerConstructor {
	readonly forgingStrategy?: HighFeeForgingStrategy;
	readonly logger: Logger;
	readonly db: KVStore;
	readonly processorModule: Processor;
	readonly dposModule: Dpos;
	readonly bftModule: BFT;
	readonly transactionPoolModule: TransactionPool;
	readonly chainModule: Chain;
	readonly maxPayloadLength: number;
	readonly forgingDelegates?: ReadonlyArray<DelegateConfig>;
	readonly forgingForce?: boolean;
	readonly forgingDefaultPassword?: string;
	readonly forgingWaitThreshold: number;
}

export class Forger {
	private readonly _logger: Logger;
	private readonly _db: KVStore;
	private readonly _processorModule: Processor;
	private readonly _dposModule: Dpos;
	private readonly _bftModule: BFT;
	private readonly _transactionPoolModule: TransactionPool;
	private readonly _chainModule: Chain;
	private readonly _keypairs: BufferMap<Keypair>;
	private readonly _config: {
		readonly forging: {
			readonly force?: boolean;
			delegates?: ReadonlyArray<DelegateConfig>;
			readonly defaultPassword?: string;
			readonly waitThreshold: number;
		};
	};
	private readonly _constants: {
		readonly maxPayloadLength: number;
	};
	private readonly _forgingStrategy?: HighFeeForgingStrategy;

	public constructor({
		forgingStrategy,
		logger,
		db,
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
		this._keypairs = new BufferMap<Keypair>();
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
		this._constants = {
			maxPayloadLength,
		};

		this._processorModule = processorModule;
		this._dposModule = dposModule;
		this._bftModule = bftModule;
		this._transactionPoolModule = transactionPoolModule;
		this._chainModule = chainModule;

		this._forgingStrategy =
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			forgingStrategy ??
			new HighFeeForgingStrategy({
				transactionPoolModule: this._transactionPoolModule,
				chainModule: this._chainModule,
				maxPayloadLength: this._constants.maxPayloadLength,
			});
	}

	public delegatesEnabled(): boolean {
		return Object.keys(this._keypairs).length > 0;
	}

	public async updateForgingStatus(
		publicKey: string,
		password: string,
		forging: boolean,
	): Promise<ForgingStatus> {
		const encryptedList = this._config.forging.delegates;
		const encryptedItem = encryptedList?.find(
			item => item.publicKey === publicKey,
		);

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
			throw new Error(`Delegate with publicKey: ${publicKey} not found`);
		}

		if (keypair.publicKey.toString('hex') !== publicKey) {
			throw new Error('Invalid password and public key combination');
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const [
			account,
		] = await this._chainModule.dataAccess.getAccountsByPublicKey([
			keypair.publicKey,
		]);

		if (account.asset.delegate.username !== '') {
			if (forging) {
				this._keypairs.set(getAddressFromPublicKey(keypair.publicKey), keypair);
				this._logger.info(
					`Forging enabled on account: ${account.address.toString('base64')}`,
				);
			} else {
				this._keypairs.delete(getAddressFromPublicKey(keypair.publicKey));
				this._logger.info(
					`Forging disabled on account: ${account.address.toString('base64')}`,
				);
			}

			return {
				publicKey,
				forging,
			};
		}
		throw new Error('Delegate not found');
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
		const registeredHashOnionSeeds = await getRegisteredHashOnionSeeds(
			this._db,
		);

		for (const encryptedItem of encryptedList) {
			let passphrase;
			try {
				passphrase = decryptPassphraseWithPassword(
					parseEncryptedPassphrase(encryptedItem.encryptedPassphrase),
					this._config.forging.defaultPassword,
				);
			} catch (error) {
				const decryptionError = `Invalid encryptedPassphrase for publicKey: ${
					encryptedItem.publicKey
				}. ${(error as Error).message}`;
				this._logger.error(decryptionError);
				throw new Error(decryptionError);
			}

			const keypair = getPrivateAndPublicKeyFromPassphrase(passphrase);

			if (keypair.publicKey.toString('hex') !== encryptedItem.publicKey) {
				throw new Error(
					`Invalid encryptedPassphrase for publicKey: ${encryptedItem.publicKey}. Public keys do not match`,
				);
			}

			const [
				account,
			] = await this._chainModule.dataAccess.getAccountsByPublicKey([
				keypair.publicKey,
			]);

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (!account) {
				throw new Error(
					`Account with public key: ${keypair.publicKey.toString(
						'base64',
					)} not found`,
				);
			}
			if (account.asset.delegate.username !== '') {
				this._keypairs.set(getAddressFromPublicKey(keypair.publicKey), keypair);
				this._logger.info(
					`Forging enabled on account: ${account.address.toString('base64')}`,
				);
			} else {
				this._logger.warn(
					{},
					`Account with public key: ${keypair.publicKey.toString(
						'base64',
					)} is not a delegate`,
				);
			}
			// Prepare hash-onion
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const registeredHashOnionSeed = registeredHashOnionSeeds.get(
				account.address,
			);
			const hashOnionConfig = this._getHashOnionConfig(account.address);

			// If hash onion in the config is different from what is registered, remove all the used information and register the new one
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const configHashOnionSeed =
				hashOnionConfig.hashes[hashOnionConfig.hashes.length - 1];
			if (
				registeredHashOnionSeed &&
				!registeredHashOnionSeed.equals(configHashOnionSeed)
			) {
				this._logger.warn(
					`Hash onion for Account ${account.address.toString(
						'hex',
					)} is not the same as previous one. Overwriting with new hash onion`,
				);
				usedHashOnions = usedHashOnions.filter(
					ho => !ho.address.equals(account.address),
				);
			}
			// Update the registered hash onion (either same one, new one or overwritten one)
			registeredHashOnionSeeds.set(account.address, configHashOnionSeed);
			const highestUsedHashOnion = usedHashOnions.reduce<
				UsedHashOnion | undefined
			>((prev, current) => {
				if (!current.address.equals(account.address)) {
					return prev;
				}
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (!prev || prev.count < current.count) {
					return current;
				}
				return prev;
			}, undefined);

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
				throw new Error(
					`All of the hash onion is used for ${account.address.toString(
						'base64',
					)}`,
				);
			}
		}
		await setRegisteredHashOnionSeeds(this._db, registeredHashOnionSeeds);
		await setUsedHashOnions(this._db, usedHashOnions);
	}

	public async forge(): Promise<void> {
		const currentSlot = this._chainModule.slots.getSlotNumber();
		const currentSlotTime = this._chainModule.slots.getRealTime(
			this._chainModule.slots.getSlotTime(currentSlot),
		);

		const currentTime = new Date().getTime();
		const waitThreshold = this._config.forging.waitThreshold * 1000;
		const { lastBlock } = this._chainModule;
		const lastBlockSlot = this._chainModule.slots.getSlotNumber(
			lastBlock.header.timestamp,
		);

		if (currentSlot === lastBlockSlot) {
			this._logger.trace(
				{ slot: currentSlot },
				'Block already forged for the current slot',
			);
			return;
		}

		// We calculate round using height + 1, because we want the delegate keypair for next block to be forged
		const round = this._dposModule.rounds.calcRound(
			this._chainModule.lastBlock.header.height + 1,
		);

		let delegateKeypair: Keypair | undefined;
		try {
			// eslint-disable-next-line @typescript-eslint/no-use-before-define
			delegateKeypair = await this._getDelegateKeypairForCurrentSlot(
				currentSlot,
				round,
			);
		} catch (err) {
			this._logger.error({ err: err as Error }, 'Skipping delegate slot');
			throw err;
		}

		if (delegateKeypair === undefined) {
			this._logger.trace(
				{ currentSlot: this._chainModule.slots.getSlotNumber() },
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

		const timestamp = this._chainModule.slots.getSlotTime(currentSlot);
		const previousBlock = this._chainModule.lastBlock;
		const transactions = await this._forgingStrategy?.getTransactionsForBlock();

		const delegateAddress = getAddressFromPublicKey(delegateKeypair.publicKey);
		const nextHeight = previousBlock.header.height + 1;

		const usedHashOnions = await getUsedHashOnions(this._db);
		const nextHashOnion = this._getNextHashOnion(
			usedHashOnions,
			delegateAddress,
			nextHeight,
		);
		const index = usedHashOnions.findIndex(
			ho => ho.address === delegateAddress && ho.count === nextHashOnion.count,
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
		const forgedBlock = await this._processorModule.create({
			keypair: delegateKeypair,
			timestamp,
			transactions: transactions as BaseTransaction[],
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
				round: this._dposModule.rounds.calcRound(forgedBlock.header.height),
				slot: this._chainModule.slots.getSlotNumber(
					forgedBlock.header.timestamp,
				),
				reward: forgedBlock.header.reward.toString(),
			},
			'Forged new block',
		);
	}

	public getForgersKeyPairs(): BufferMap<Keypair> {
		return this._keypairs;
	}

	// eslint-disable-next-line class-methods-use-this
	public getForgingStatusOfAllDelegates(): ForgingStatus[] | undefined {
		const forgingDelegates = this._config.forging.delegates;
		const forgersPublicKeys: { [key: string]: boolean } = {};

		for (const keypair of this._keypairs.values()) {
			forgersPublicKeys[keypair.publicKey.toString('hex')] = true;
		}

		const fullList = forgingDelegates?.map(forger => ({
			forging: !!forgersPublicKeys[forger.publicKey],
			publicKey: forger.publicKey,
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
		const usedHashOnion = usedHashOnions.reduce<UsedHashOnion | undefined>(
			(prev, current) => {
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
			},
			undefined,
		);
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
		const delegateConfig = this._config.forging.delegates?.find(d =>
			getAddressFromPublicKey(Buffer.from(d.publicKey, 'hex')).equals(address),
		);
		if (!delegateConfig?.hashOnion) {
			throw new Error(
				`Account ${address.toString(
					'base64',
				)} does not have hash onion in the config`,
			);
		}

		return {
			count: delegateConfig.hashOnion.count,
			distance: delegateConfig.hashOnion.distance,
			hashes: delegateConfig.hashOnion.hashes.map(h => Buffer.from(h, 'hex')),
		};
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
				highest: new BufferMap<UsedHashOnion>(),
			},
		);

		const filtered = filteredObject.others.filter(
			ho => ho.height > finalizedHeight,
		);
		return filtered.concat(filteredObject.highest.values());
	}

	private async _getDelegateKeypairForCurrentSlot(
		currentSlot: number,
		round: number,
	): Promise<Keypair | undefined> {
		const activeDelegates = await this._dposModule.getForgerAddressesForRound(
			round,
		);

		const currentSlotIndex = currentSlot % activeDelegates.length;
		const currentSlotDelegate = activeDelegates[currentSlotIndex];

		if (
			currentSlotDelegate.length > 0 &&
			this._keypairs.has(currentSlotDelegate)
		) {
			return this._keypairs.get(currentSlotDelegate);
		}

		return undefined;
	}
}
