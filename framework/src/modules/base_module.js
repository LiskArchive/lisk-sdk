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

const { ImplementationMissingError } = require('../errors');

/* eslint-disable class-methods-use-this,no-unused-vars */

module.exports = class BaseModule {
	constructor(options) {
		this.options = options;
	}

	static get alias() {
		throw new ImplementationMissingError();
	}

	static get info() {
		throw new ImplementationMissingError();
	}

	// Array of migrations to be executed before loading the module. Expected format: ['yyyyMMddHHmmss_name_of_migration.sql']
	static get migrations() {
		return [];
	}

	get defaults() {
		// This interface is not required to be implemented
		return {};
	}

	get events() {
		// This interface is not required to be implemented
		return [];
	}

	get actions() {
		// This interface is not required to be implemented
		return {};
	}

	async load(channel) {
		throw new ImplementationMissingError();
	}

	async unload() {
		// This interface is not required.
		return true;
	}
};
