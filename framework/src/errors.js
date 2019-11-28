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
/* eslint-disable max-classes-per-file */

'use strict';

class FrameworkError extends Error {
	constructor(...args) {
		super(...args);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, FrameworkError);
	}
}

class SchemaValidationError extends FrameworkError {
	constructor(errors) {
		super(JSON.stringify(errors, null, 2));
		this.errors = errors;
	}
}

class DuplicateAppInstanceError extends FrameworkError {
	constructor(appLabel, pidPath) {
		super(`Duplicate app instance for "${appLabel}"`);
		this.appLabel = appLabel;
		this.pidPath = pidPath;
	}
}

class ImplementationMissingError extends FrameworkError {
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
