const BlockSynchronizationMechanism = require('./block_synchronization_mechanism');
const FastChainSwitchingMechanism = require('./fast_chain_switching_mechanism');

class Synchronizer {
	constructor() {
		this.currentStrategy = null;
		this.blockSynchronizationMechanism = new BlockSynchronizationMechanism();
		this.fastChainSwitchingMechanism = new FastChainSwitchingMechanism();
	}

	/**
	 * Start the syncing mechanism
	 * @return {*}
	 */
	run() {
		if (this.currentStrategy && this.currentStrategy.isActive()) {
			throw new Error('Blocks Sychronizer is already running');
		}

		this.currentStrategy = this._determineStrategy();

		return this.currentStrategy.run();
	}

	/**
	 * Check if the current syncing mechanism is active
	 * @return {*|never|boolean}
	 */
	isActive() {
		return this.currentStrategy.isActive();
	}

	/**
	 * Determine and return the syncing mechanism strategy to follow
	 * @private
	 */
	// eslint-disable-next-line class-methods-use-this
	_determineStrategy() {
		// Return blockSynchronizationMechanism or fastChainSwitchingMechanism depending on
		// Moving to a Different Chain conditions defined in LIP-0014
	}
}

module.exports = Synchronizer;
