class BlockSynchronizationMechanism {
	constructor() {
		this.active = false;
	}

	async run() {}

	isActive() {
		return this.active;
	}
}

module.exports = BlockSynchronizationMechanism;
