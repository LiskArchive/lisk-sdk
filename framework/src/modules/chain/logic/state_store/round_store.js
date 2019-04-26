class RoundStore {
	constructor(RoundEntity, { tx }) {
		this.round = RoundEntity;
		this.data = [];
		this.primaryKey = 'id';
		this.name = 'round';
		this.tx = tx;
	}

	async cache() {
		throw new Error(`cache cannot be called for ${this.name}`);
	}

	add(element) {
		this.data.push(element);
	}

	createSnapshot() {
		throw new Error(`createSnapshot cannot be called for ${this.name}`);
	}

	restoreSnapshot() {
		throw new Error(`restoreSnapshot cannot be called for ${this.name}`);
	}

	get() {
		throw new Error(`get cannot be called for ${this.name}`);
	}

	getOrDefault() {
		throw new Error(`getOrDefault cannot be called for ${this.name}`);
	}

	find() {
		throw new Error(`find cannot be called for ${this.name}`);
	}

	set() {
		throw new Error(`set cannot be called for ${this.name}`);
	}

	setRoundForData(round) {
		this.data = this.data.map(roundData => ({ ...roundData, round }));
	}

	finalize() {
		return Promise.all(
			this.data.map(roundData => this.round.create(roundData, {}, this.tx))
		);
	}
}

module.exports = RoundStore;
