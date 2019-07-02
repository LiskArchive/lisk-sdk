class BlockSynchronizationMechanism {
	constructor({ storage, logger }) {
		this.storage = storage;
		this.logger = logger;
		this.active = false;
	}

	// eslint-disable-next-line class-methods-use-this,no-empty-function
	async run() {}

	get isActive() {
		return this.active;
	}
}

module.exports = BlockSynchronizationMechanism;
