const BlockSynchronizationMechanism = require('./block_synchronization_mechanism');
const FastChainSwitchingMechanism = require('./fast_chain_switching_mechanism');

class Synchronizer {
	constructor() {
		this.currentStrategy = null;
	}

	run() {
		if (this.currentStrategy && this.currentStrategy.isActive()) {
			throw new Error('Blocks Sychronizer is already running');
		}

		this.currentStrategy = this._determineStrategy();
		return this.currentStrategy.run();
	}

	isActive() {
		return this.currentStrategy.isActive();
	}

	/**
	 * Determine and return the mechanism strategy to follow
	 * @private
	 */
	// eslint-disable-next-line class-methods-use-this
	_determineStrategy() {
		if (1) {
			return new BlockSynchronizationMechanism();
		}
		return new FastChainSwitchingMechanism();
	}
}

module.exports = Synchronizer;
