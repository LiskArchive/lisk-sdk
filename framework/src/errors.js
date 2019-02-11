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
	}
}

/**
 * Error occurred when you start an app instance which is already running
 * @extends DuplicateAppInstanceError
 * @namespace Framework.errors
 */
class DuplicateAppInstanceError extends FrameworkError {
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
	 * Create a schema validation error object
	 */
	constructor() {
		super('Schema validation error');
	}
}

module.exports = {
	FrameworkError,
	SchemaValidationError,
	DuplicateAppInstanceError,
	ImplementationMissingError,
};
