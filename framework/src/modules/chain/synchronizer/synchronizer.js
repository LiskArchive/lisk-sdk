const BlockSynchronizationMechanism = require('./block_synchronization_mechanism');
const FastChainSwitchingMechanism = require('./fast_chain_switching_mechanism');

class Synchronizer {
	constructor({ storage, logger }) {
		this.storage = storage;
		this.logger = logger;

		this.activeMechanism = null;
		this.blockSynchronizationMechanism = new BlockSynchronizationMechanism({
			storage,
			logger,
		});
		this.fastChainSwitchingMechanism = new FastChainSwitchingMechanism({
			storage,
			logger,
		});
	}

	/**
	 * Start the syncing mechanism
	 *
	 * @return {*}
	 */

	/**
	 * Start the syncing mechanism
	 * @param {Object} receivedBlock - The block you received from network, used to choose sync mechanism
	 * @return {*}
	 */
	run(receivedBlock) {
		if (this.activeMechanism && this.activeMechanism.isActive) {
			throw new Error('Blocks Sychronizer is already running');
		}

		// Choose the right mechanism to sync
		this.activeMechanism = this._determineSyncMechanism(receivedBlock);

		if (!this.activeMechanism) {
			return this.logger.info(
				"Can't determine sync mechanism at the moment for block",
				receivedBlock
			);
		}

		return this.activeMechanism.run(receivedBlock);
	}

	/**
	 * Check if the current syncing mechanism is active
	 * @return {*|never|boolean}
	 */
	isActive() {
		return this.activeMechanism ? this.activeMechanism.isActive : false;
	}

	/**
	 * Determine and return the syncing mechanism strategy to follow
	 * @private
	 */
	// eslint-disable-next-line class-methods-use-this, no-unused-vars
	_determineSyncMechanism(receivedBlock) {
		// Return blockSynchronizationMechanism or fastChainSwitchingMechanism depending on
		// Moving to a Different Chain conditions defined in LIP-0014
	}
}

module.exports = Synchronizer;
