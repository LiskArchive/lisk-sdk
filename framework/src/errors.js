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

/**
 * Class representing base error class for any framework related error
 * @namespace Framework.errors
 */
class FrameworkError extends Error {
	constructor(...args) {
		super(...args);
		Error.captureStackTrace(this, FrameworkError);
	}
}

/**
 * Error class occurred when any schema validation failed for any input data
 * @extends FrameworkError
 * @namespace Framework.errors
 */
class SchemaValidationError extends FrameworkError {
	/**
	 * Create a schema validation error object
	 * @param {Array.<Object>} errors - Array of schema validation errors
	 */
	constructor(errors) {
		super('Schema validation error');
		this.errors = errors;
		this.message = JSON.stringify(errors, null, 2);
	}
}

/**
 * Error occurred when you start an app instance which is already running
 * @extends DuplicateAppInstanceError
 * @namespace Framework.errors
 */
class DuplicateAppInstanceError extends FrameworkError {
	/**
	 * Create duplicate app instance error object
	 *
	 * @param {string} appLabel - Application label
	 * @param {string} pidPath - Path of the pid file running the app
	 */
	constructor(appLabel, pidPath) {
		super(`Duplicate app instance for "${appLabel}"`);
		this.appLabel = appLabel;
		this.pidPath = pidPath;
	}
}

/**
 * Error occurred when some required function have no implementation
 * @extends ImplementationMissingError
 * @namespace Framework.errors
 */
class ImplementationMissingError extends FrameworkError {
	/**
	 * Create a implementation missing error object
	 */
	constructor() {
		super('Implementation missing error');
	}
}

module.exports = {
	FrameworkError,
	SchemaValidationError,
	DuplicateAppInstanceError,
	ImplementationMissingError,
};
