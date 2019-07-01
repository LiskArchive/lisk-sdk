class Synchronizer {
	constructor() {
		this.currentStrategy = null;
		this.strategies = {};
	}

	/**
	 * Start the syncing mechanism
	 * @return {*}
	 */
	run() {
		if (this.currentStrategy && this.currentStrategy.isActive()) {
			throw new Error('Synchronizer is already running');
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
		// TODO: Return blockSynchronizationMechanism or fastChainSwitchingMechanism depending on
		// Moving to a Different Chain conditions defined in LIP-0014
	}

	/**
	 * Add a synchronization mechanism strategy to the list
	 * @param implementation
	 */
	addStrategy(implementation) {
		this.strategies[implementation.constructor.name] = implementation;
	}
}

module.exports = Synchronizer;
