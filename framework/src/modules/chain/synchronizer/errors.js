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

const { FrameworkError } = require('../../../errors');

class SynchronizerError extends FrameworkError {}

class BlockProcessingError extends SynchronizerError {}

class RestartError extends SynchronizerError {
	constructor(reason) {
		super(`Restart synchronization mechanism with reason: ${reason}`);
	}
}

class AbortError extends SynchronizerError {
	constructor(reason) {
		super(`Abort synchronization mechanism with reason: ${reason}`);
		this.reason = reason;
	}
}

class ApplyPenaltyAndRestartError extends SynchronizerError {
	constructor(peerId, reason) {
		super(
			`Apply penalty and restart synchronization mechanism with reason: ${reason}`,
		);
		this.reason = reason;
		this.peerId = peerId;
	}
}

class ApplyPenaltyAndAbortError extends SynchronizerError {
	constructor(peerId, reason) {
		super(
			`Apply penalty and abort synchronization mechanism with reason: ${reason}`,
		);
		this.reason = reason;
		this.peerId = peerId;
	}
}

module.exports = {
	BlockProcessingError,
	RestartError,
	AbortError,
	ApplyPenaltyAndAbortError,
	ApplyPenaltyAndRestartError,
};
