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

const path = require('path');
const {
	Account,
	BaseEntity,
	Block,
	Delegate,
	Peer,
	Transaction,
} = require('./entities');
const PgpAdapter = require('./adapters/pgp_adapter');

class Storage {
	constructor(options, logger) {
		this.options = options;
		this.logger = logger;

		if (typeof Storage.instance === 'object') {
			return Storage.instance;
		}

		this.isReady = false;

		Storage.instance = this;

		Storage.instance.BaseEntity = BaseEntity;
	}

	/**
	 * @return Promise
	 */
	bootstrap() {
		const adapter = new PgpAdapter(
			Object.assign({}, this.options, {
				inTest: process.env.NODE_ENV === 'test',
				sqlDirectory: path.join(path.dirname(__filename), 'sql'),
				logger: this.logger,
			})
		);

		return adapter.connect().then(status => {
			if (status) {
				this.isReady = true;
				Storage.instance.adapter = adapter;

				Storage.instance.entities = {
					Account: new Account(Storage.instance.adapter),
					Block: new Block(Storage.instance.adapter),
					Delegate: new Delegate(Storage.instance.adapter),
					Peer: new Peer(Storage.instance.adapter),
					Transaction: new Transaction(Storage.instance.adapter),
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

module.exports = Storage;
