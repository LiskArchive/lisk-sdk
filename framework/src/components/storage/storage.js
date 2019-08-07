/*
 * Copyright © 2019 Lisk Foundation
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

const assert = require('assert');
const path = require('path');
const { BaseEntity } = require('./entities');
const PgpAdapter = require('./adapters/pgp_adapter');
const { EntityRegistrationError } = require('./errors');

class Storage {
	constructor(options, logger) {
		this.options = options;
		this.logger = logger;

		this.isReady = false;
		this.adapter = new PgpAdapter({
			...this.options,
			inTest: process.env.NODE_ENV === 'test',
			sqlDirectory: path.join(path.dirname(__filename), './sql'),
			logger: this.logger,
		});
		this.BaseEntity = BaseEntity;
		this.entities = {};
	}

	/**
	 * @return Promise
	 */
	bootstrap() {
		return this.adapter.connect().then(status => {
			if (status) {
				this.isReady = true;
			}

			return status;
		});
	}

	cleanup() {
		this.adapter.disconnect();
		this.isReady = false;
	}

	/**
	 * Register an entity by initializing its object.
	 * It will be accessible through `storage.entities.[identifier]
	 *
	 * @param {string} identifier - Identifier used to access the object from stoage.entities.* namespace
	 * @param {BaseEntity} Entity - A class constructor extended from BaseEntity
	 * @param {Object} [options]
	 * @param {Boolean} [options.replaceExisting] - Replace the existing entity
	 * @param {Array.<*>} [options.initParams] - Extra parameters to pass to initialization of entity
	 * @returns {BaseEntity}
	 */
	registerEntity(identifier, Entity, options = {}) {
		assert(identifier, 'Identifier is required to register an entity.');
		assert(Entity, 'Entity is required to register it.');

		const existed = Object.keys(this.entities).includes(identifier);

		if (existed && !options.replaceExisting) {
			throw new EntityRegistrationError(
				`Entity ${identifier} already registered`,
			);
		}

		let args = [this.adapter];

		if (options.initParams) {
			args = args.concat(options.initParams);
		}

		const entityObject = new Entity(...args);

		this.entities[identifier] = entityObject;

		return entityObject;
	}
}

module.exports = Storage;
