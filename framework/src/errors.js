class FrameworkError extends Error {
	constructor(...args) {
		super(...args);
		Error.captureStackTrace(this, FrameworkError);
	}
}

class SchemaValidationError extends FrameworkError {
	constructor(errors) {
		super('Schema validation error');
		this.errors = errors;
	}
}

module.exports = {
	FrameworkError,
	SchemaValidationError,
};
