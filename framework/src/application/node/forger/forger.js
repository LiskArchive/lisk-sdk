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

'use strict';

const {
	getPrivateAndPublicKeyBytesFromPassphrase,
	decryptPassphraseWithPassword,
	parseEncryptedPassphrase,
	hashOnion,
	getAddressFromPublicKey,
} = require('@liskhq/lisk-cryptography');

const {
	FORGER_INFO_KEY_USED_HASH_ONION,
	FORGER_INFO_KEY_REGISTERED_HASH_ONION_SEEDS,
} = require('./constant');
const { HighFeeForgingStrategy } = require('./strategies');

class Forger {
	constructor({
		forgingStrategy,
		// components
		channel,
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
	}) {
		this.keypairs = {};
		this.channel = channel;
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
			forgingStrategy ||
			new HighFeeForgingStrategy({
				logger: this.logger,
				transactionPoolModule: this.transactionPoolModule,
				chainModule: this.chainModule,
				maxPayloadLength: this.constants.maxPayloadLength,
			});
	}

	// eslint-disable-next-line class-methods-use-this
	delegatesEnabled() {
		return Object.keys(this.keypairs).length > 0;
	}

	// eslint-disable-next-line class-methods-use-this
	async updateForgingStatus(publicKey, password, forging) {
		const encryptedList = this.config.forging.delegates;
		const encryptedItem = encryptedList.find(
			item => item.publicKey === publicKey,
		);

		let keypair;
		let passphrase;

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

		const [account] = await this.chainModule.dataAccess.getAccountsByPublicKey([
			keypair.publicKey.toString('hex'),
		]);

		if (account && account.isDelegate) {
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

	async loadDelegates() {
		const encryptedList = this.config.forging.delegates;

		if (
			!encryptedList ||
			!encryptedList.length ||
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
				const decryptionError = `Invalid encryptedPassphrase for publicKey: ${encryptedItem.publicKey}. ${error.message}`;
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
			] = await this.chainModule.dataAccess.getAccountsByPublicKey([
				keypair.publicKey.toString('hex'),
			]);

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
					`Account with public key: ${keypair.publicKey.toString(
						'hex',
					)} is not a delegate`,
				);
			}
			// Prepare hash-onion
			const registeredHashOnionSeed = registeredHashOnionSeeds[account.address];
			const hashOnionConfig = this._getHashOnionConfig(account.address);

			// If hash onion in the config is different from what is registered, remove all the used information and register the new one
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
			const highestUsedHashOnion = usedHashOnions.reduce((prev, current) => {
				if (current.address !== account.address) {
					return prev;
				}
				if (!prev || prev.count < current.count) {
					return current;
				}
				return prev;
			}, undefined);

			// If there are no previous usage, no need to check further
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

	// eslint-disable-next-line class-methods-use-this
	async forge() {
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

		let delegateKeypair;
		try {
			// eslint-disable-next-line no-use-before-define
			delegateKeypair = await this._getDelegateKeypairForCurrentSlot(
				currentSlot,
				round,
			);
		} catch (err) {
			this.logger.error({ err }, 'Skipping delegate slot');
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
			this.logger.debug('Slot information', {
				currentSlot,
				lastBlockSlot,
				waitThreshold,
			});
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
		const nextHashOnion = await this._getNextHashOnion(
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

		const forgedBlock = await this.processorModule.create({
			keypair: delegateKeypair,
			timestamp,
			transactions,
			previousBlock,
			seedReveal: nextHashOnion.hash,
		});

		await this._setUsedHashOnions(updatedUsedHashOnion);

		await this.processorModule.process(forgedBlock);

		this.logger.info(
			{
				id: forgedBlock.id,
				generatorAddress: delegateAddress,
				seedReveal: nextHashOnion.hash,
				height: forgedBlock.height,
				round: this.dposModule.rounds.calcRound(forgedBlock.height),
				slot: this.chainModule.slots.getSlotNumber(forgedBlock.timestamp),
				reward: forgedBlock.reward.toString(),
			},
			'Forged new block',
		);
	}

	// eslint-disable-next-line class-methods-use-this
	getForgersKeyPairs() {
		return this.keypairs;
	}

	// eslint-disable-next-line class-methods-use-this
	getForgingStatusForAllDelegates() {
		const keyPairs = this.keypairs;
		const forgingDelegates = this.config.forging.delegates;
		const forgersPublicKeys = {};

		Object.keys(keyPairs).forEach(key => {
			forgersPublicKeys[keyPairs[key].publicKey.toString('hex')] = true;
		});

		const fullList = forgingDelegates.map(forger => ({
			forging: !!forgersPublicKeys[forger.publicKey],
			publicKey: forger.publicKey,
		}));

		return fullList;
	}

	async _getNextHashOnion(usedHashOnions, address, height) {
		// Get highest hashonion that is used by this address below height
		const usedHashOnion = usedHashOnions.reduce((prev, current) => {
			if (current.address !== address) {
				return prev;
			}
			if (current.height < height && (!prev || prev.height < current.height)) {
				return current;
			}
			return prev;
		}, undefined);
		const hashOnionConfig = this._getHashOnionConfig(address);
		if (!usedHashOnion) {
			return {
				hash: hashOnionConfig.hashes[0],
				count: 0,
			};
		}
		const { count: usedCount } = usedHashOnion;
		const nextCount = usedCount + 1;
		if (nextCount > hashOnionConfig.count) {
			throw new Error('All of the hash onion has been used already');
		}
		const nextCheckpointIndex = Math.ceil(nextCount / hashOnionConfig.distance);
		const nextCheckpoint = Buffer.from(
			hashOnionConfig.hashes[nextCheckpointIndex],
			'hex',
		);
		const hashes = hashOnion(nextCheckpoint, hashOnionConfig.distance, 1);
		const checkpointIndex = nextCount % hashOnionConfig.distance;
		return { hash: hashes[checkpointIndex].toString('hex'), count: nextCount };
	}

	_getHashOnionConfig(address) {
		const delegateConfig = this.config.forging.delegates.find(
			d => getAddressFromPublicKey(d.publicKey) === address,
		);
		if (!delegateConfig || !delegateConfig.hashOnion) {
			throw new Error(
				`Account ${address} does not have hash onion in the config`,
			);
		}
		return delegateConfig.hashOnion;
	}

	async _getRegisteredHashOnionSeeds() {
		const registeredHashOnionSeedsStr = await this.storage.entities.ForgerInfo.getKey(
			FORGER_INFO_KEY_REGISTERED_HASH_ONION_SEEDS,
		);
		return registeredHashOnionSeedsStr
			? JSON.parse(registeredHashOnionSeedsStr)
			: {};
	}

	async _setRegisteredHashOnionSeeds(registeredHashOnionSeeds) {
		const registeredHashOnionSeedsStr = JSON.stringify(
			registeredHashOnionSeeds,
		);
		await this.storage.entities.ForgerInfo.setKey(
			FORGER_INFO_KEY_REGISTERED_HASH_ONION_SEEDS,
			registeredHashOnionSeedsStr,
		);
	}

	async _getUsedHashOnions() {
		const usedHashOnionsStr = await this.storage.entities.ForgerInfo.getKey(
			FORGER_INFO_KEY_USED_HASH_ONION,
		);
		return usedHashOnionsStr ? JSON.parse(usedHashOnionsStr) : [];
	}

	// eslint-disable-next-line class-methods-use-this
	_filterUsedHashOnions(usedHashOnions, finalizedHeight) {
		return usedHashOnions.filter(ho => ho.height > finalizedHeight);
	}

	async _setUsedHashOnions(usedHashOnions) {
		const usedHashOnionsStr = JSON.stringify(usedHashOnions);
		await this.storage.entities.ForgerInfo.setKey(
			FORGER_INFO_KEY_USED_HASH_ONION,
			usedHashOnionsStr,
		);
	}

	async _getDelegateKeypairForCurrentSlot(currentSlot, round) {
		const activeDelegates = await this.dposModule.getForgerAddressesForRound(
			round,
		);

		const currentSlotIndex = currentSlot % activeDelegates.length;
		const currentSlotDelegate = activeDelegates[currentSlotIndex];

		if (currentSlotDelegate && this.keypairs[currentSlotDelegate]) {
			return this.keypairs[currentSlotDelegate];
		}

		return null;
	}
}

// Export
module.exports = {
	Forger,
};
