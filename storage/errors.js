'use strict';

class BaseStorageError extends Error {
	constructor(...args) {
		super(...args);
		Error.captureStackTrace(this, BaseStorageError);
	}
}

class ImplementationPendingError extends BaseStorageError {}
class NonSupportedFilterTypeError extends BaseStorageError {}

module.exports = {
	ImplementationPendingError,
	NonSupportedFilterTypeError,
};
