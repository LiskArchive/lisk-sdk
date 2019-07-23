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

class BaseStorageError extends Error {
	constructor(...args) {
		super(...args);
		Error.captureStackTrace(this, BaseStorageError);
	}
}

class ImplementationPendingError extends BaseStorageError {}
class NonSupportedFilterTypeError extends BaseStorageError {}
class NonSupportedOptionError extends BaseStorageError {}
class NonSupportedOperationError extends BaseStorageError {}
class EntityRegistrationError extends BaseStorageError {}

module.exports = {
	ImplementationPendingError,
	NonSupportedFilterTypeError,
	NonSupportedOptionError,
	NonSupportedOperationError,
	EntityRegistrationError,
};
