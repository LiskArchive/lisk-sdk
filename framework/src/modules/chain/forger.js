/*
 * Copyright © 2018 Lisk Foundation
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
	getAddressFromPublicKey,
} = require('@liskhq/lisk-cryptography');

// Private fields
let modules;

const { ACTIVE_DELEGATES, MAX_TRANSACTIONS_PER_BLOCK } = global.constants;

/**
 * Gets the assigned delegate to current slot and returns its keypair if present.
 *
 * @private
 * @param {number} slot
 * @param {number} round
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err, {time, keypair}
 * @todo Add description for the params
 */
const getDelegateKeypairForCurrentSlot = async (
	rounds,
	keypairs,
	currentSlot,
	round
) => {
	const activeDelegates = await rounds.generateDelegateList(round);

	const currentSlotIndex = currentSlot % ACTIVE_DELEGATES;
	const currentSlotDelegate = activeDelegates[currentSlotIndex];

	if (currentSlotDelegate && keypairs[currentSlotDelegate]) {
		return keypairs[currentSlotDelegate];
	}

	return null;
};

/**
 * Main delegates methods. Initializes library with scope content and generates a Delegate instance.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires lodash
 * @param {scope} scope - App instance
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err, self
 */
class Forger {
	constructor(scope) {
		this.keypairs = {};
		this.channel = scope.channel;
		this.logger = scope.components.logger;
		this.storage = scope.components.storage;
		this.slots = scope.slots;
		this.config = {
			forging: {
				delegates: scope.config.forging.delegates,
				force: scope.config.forging.force,
				defaultPassword: scope.config.forging.defaultPassword,
			},
		};
	}

	/**
	 * Returns true if at least one delegate is enabled.
	 *
	 * @returns {boolean}
	 */
	// eslint-disable-next-line class-methods-use-this
	delegatesEnabled() {
		return Object.keys(this.keypairs).length > 0;
	}

	/**
	 * Updates the forging status of an account, valid actions are enable and disable.
	 *
	 * @param {publicKey} publicKey - Public key of delegate
	 * @param {string} password - Password used to decrypt encrypted passphrase
	 * @param {boolean} forging - Forging status of a delegate to update
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb
	 * @todo Add description for the return value
	 */
	// eslint-disable-next-line class-methods-use-this
	async updateForgingStatus(publicKey, password, forging) {
		const encryptedList = this.config.forging.delegates;
		const encryptedItem = encryptedList.find(
			item => item.publicKey === publicKey
		);

		let keypair;
		let passphrase;

		if (encryptedItem) {
			try {
				passphrase = decryptPassphraseWithPassword(
					parseEncryptedPassphrase(encryptedItem.encryptedPassphrase),
					password
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

		const filters = {
			address: getAddressFromPublicKey(keypair.publicKey.toString('hex')),
		};

		const options = {
			extended: true,
		};

		const [account] = await this.storage.entities.Account.get(filters, options);

		if (account && account.isDelegate) {
			if (forging) {
				this.keypairs[keypair.publicKey.toString('hex')] = keypair;
				this.logger.info(`Forging enabled on account: ${account.address}`);
			} else {
				delete this.keypairs[keypair.publicKey.toString('hex')];
				this.logger.info(`Forging disabled on account: ${account.address}`);
			}

			return {
				publicKey,
				forging,
			};
		}
		throw new Error('Delegate not found');
	}

	/**
	 * Loads delegates from config and stores in private `keypairs`.
	 *
	 * @private
	 * @returns {setImmediateCallback} cb
	 * @todo Add description for the return value
	 */
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
			`Loading ${
				encryptedList.length
			} delegates using encrypted passphrases from config`
		);

		// eslint-disable-next-line no-restricted-syntax
		for (const encryptedItem of encryptedList) {
			let passphrase;
			try {
				passphrase = decryptPassphraseWithPassword(
					parseEncryptedPassphrase(encryptedItem.encryptedPassphrase),
					this.config.forging.defaultPassword
				);
			} catch (error) {
				const decryptionError = `Invalid encryptedPassphrase for publicKey: ${
					encryptedItem.publicKey
				}. ${error.message}`;
				this.logger.error(decryptionError);
				throw decryptionError;
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
				throw `Invalid encryptedPassphrase for publicKey: ${
					encryptedItem.publicKey
				}. Public keys do not match`;
			}

			const filters = {
				address: getAddressFromPublicKey(keypair.publicKey.toString('hex')),
			};

			const options = {
				extended: true,
			};

			// eslint-disable-next-line no-await-in-loop
			const [account] = await this.storage.entities.Account.get(
				filters,
				options
			);
			if (!account) {
				throw `Account with public key: ${keypair.publicKey.toString(
					'hex'
				)} not found`;
			}
			if (account.isDelegate) {
				this.keypairs[keypair.publicKey.toString('hex')] = keypair;
				this.logger.info(`Forging enabled on account: ${account.address}`);
			} else {
				this.logger.warn(
					`Account with public key: ${keypair.publicKey.toString(
						'hex'
					)} is not a delegate`
				);
			}
		}
	}

	/**
	 * Before forge, fill transaction pool
	 *
	 * @returns {setImmediateCallback} cb
	 * @todo Add description for the return value
	 */
	// eslint-disable-next-line class-methods-use-this
	async beforeForge() {
		await modules.transactionPool.fillPool();
	}

	/**
	 * Gets peers, checks consensus and generates new block, once delegates
	 * are enabled, client is ready to forge and is the correct slot.
	 *
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	// eslint-disable-next-line class-methods-use-this
	async forge() {
		const currentSlot = this.slots.getSlotNumber();
		const lastBlock = modules.blocks.lastBlock;

		if (currentSlot === this.slots.getSlotNumber(lastBlock.timestamp)) {
			this.logger.debug('Block already forged for the current slot');
			return;
		}

		// We calculate round using height + 1, because we want the delegate keypair for next block to be forged
		const round = this.slots.calcRound(lastBlock.height + 1);

		let delegateKeypair;
		try {
			delegateKeypair = await getDelegateKeypairForCurrentSlot(
				modules.rounds,
				this.keypairs,
				currentSlot,
				round
			);
		} catch (getDelegateKeypairForCurrentSlotError) {
			this.logger.error(
				'Skipping delegate slot',
				getDelegateKeypairForCurrentSlotError
			);
			throw getDelegateKeypairForCurrentSlotError;
		}

		if (delegateKeypair === null) {
			this.logger.debug('Waiting for delegate slot', {
				currentSlot: this.slots.getSlotNumber(),
			});
			return;
		}
		const isPoorConsensus = await modules.peers.isPoorConsensus();
		if (isPoorConsensus) {
			const consensusErr = `Inadequate broadhash consensus before forging a block: ${modules.peers.getLastConsensus()} %`;
			this.logger.error(
				'Failed to generate block within delegate slot',
				consensusErr
			);
			return;
		}

		this.logger.info(
			`Broadhash consensus before forging a block: ${modules.peers.getLastConsensus()} %`
		);

		const transactions =
			modules.transactionPool.getUnconfirmedTransactionList(
				false,
				MAX_TRANSACTIONS_PER_BLOCK
			) || [];

		const forgedBlock = await modules.blocks.generateBlock(
			delegateKeypair,
			this.slots.getSlotTime(currentSlot),
			transactions
		);
		this.logger.info(
			`Forged new block id: ${forgedBlock.id} height: ${
				forgedBlock.height
			} round: ${this.slots.calcRound(
				forgedBlock.height
			)} slot: ${this.slots.getSlotNumber(forgedBlock.timestamp)} reward: ${
				forgedBlock.reward
			}`
		);
	}

	/**
	 * Get an object of key pairs for delegates enabled for forging.
	 *
	 * @returns {object} Of delegate key pairs
	 */
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

	// Events
	/**
	 * Calls Delegate.bind() with scope.
	 *
	 * @param {modules} scope - Loaded modules
	 */
	// eslint-disable-next-line class-methods-use-this
	onBind(scope) {
		modules = {
			blocks: scope.modules.blocks,
			peers: scope.modules.peers,
			transactionPool: scope.modules.transactionPool,
			rounds: scope.modules.rounds,
		};
	}
}

// Export
module.exports = { Forger, getDelegateKeypairForCurrentSlot };
