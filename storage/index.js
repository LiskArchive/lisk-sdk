'use strict';

const path = require('path');
const { BaseEntity, Account, Block, Transaction } = require('./entities');
const PgpAdapter = require('./adapters/pgp_adapter');

class Storage {
	constructor(options) {
		this.options = options;

		if (typeof Storage.instance === 'object') {
			return Storage.instance;
		}

		this.isReady = false;

		Storage.instance = this;

		Storage.instance.BaseEntity = BaseEntity;
		Storage.instance.BaseEntity.adapter = null;
	}

	/**
	 * @return Promise
	 */
	bootstrap() {
		const adapter = new PgpAdapter(
			Object.assign({}, this.options, {
				inTest: process.env.NODE_ENV === 'test',
				sqlDirectory: path.join(path.dirname(__filename), './sql'),
			})
		);

		return adapter.connect().then(status => {
			if (status) {
				this.isReady = true;
				Storage.instance.adapter = adapter;
				BaseEntity.prototype.adapter = adapter;

				Storage.instance.entities = {
					Transaction: new Transaction(),
					Block: new Block(),
					Account: new Account(),
				};
			}

			return status;
		});
	}

	cleanup() {
		return Storage.instance.adapter.disconnect().then(() => {
			this.isReady = false;
		});
	}
}

module.exports = function createStorage(options) {
	return new Storage(options);
};
