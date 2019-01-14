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
const { BaseEntity } = require('./entities');
const PgpAdapter = require('./adapters/pgp_adapter');
const { EntityRegistrationError } = require('./errors');

class Storage {
	constructor(options, logger) {
		this.options = options;
		this.logger = logger;

		if (typeof Storage.instance === 'object') {
			return Storage.instance;
		}

		this.isReady = false;
		Storage.instance = this;
		Storage.instance.adapter = new PgpAdapter({
			...this.options,
			inTest: process.env.NODE_ENV === 'test',
			sqlDirectory: path.join(path.dirname(__filename), './sql'),
			logger: this.logger,
		});
		Storage.instance.BaseEntity = BaseEntity;
		Storage.instance.entities = {};
	}

	/**
	 * @return Promise
	 */
	bootstrap() {
		return Storage.instance.adapter.connect().then(status => {
			if (status) {
				this.isReady = true;
			}

			return status;
		});
	}

	cleanup() {
		return Storage.instance.adapter.disconnect().then(() => {
			this.isReady = false;
		});
	}

	/**
	 * Register an entity by initializing its object.
	 * It would be accessible through `storage.entities.[identifier]
	 *
	 * @param {string} identifier - Identifier used to access the object from stoage.entities.* namespace
	 * @param {BaseEntity} Entity - A class constructor extended from BaseEntity
	 * @param {Object} [options]
	 * @param {Boolean} [options.replaceExisting] - Replace the existing entity
	 * @param {Array.<*>} [options.initParams] - Extra parameters to pass to initialization of entity
	 * @returns {BaseEntity}
	 */
	register(identifier, Entity, options = {}) {
		const existed = Object.keys(Storage.instance.entities).includes(identifier);

		if (existed && !options.replaceExisting) {
			throw new EntityRegistrationError(
				`Entity ${identifier} already registered`
			);
		}

		let args = [Storage.instance.adapter];

		if (options.initParams) {
			args = args.concat(options.initParams);
		}

		const entityObject = new Entity(...args);

		this.constructor.instance.entities[identifier] = entityObject;

		return entityObject;
	}
}

module.exports = Storage;
