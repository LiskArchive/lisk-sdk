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
/* eslint-disable max-classes-per-file */

'use strict';

const { FrameworkError } = require('../../../errors');

class BFTError extends FrameworkError {}

class BFTChainDisjointError extends BFTError {
	constructor() {
		super(
			'Violation of disjointness condition. If delegate forged a block of higher height earlier and later the block with lower height',
		);
	}
}

class BFTLowerChainBranchError extends BFTError {
	constructor() {
		super(
			'Violation of the condition that delegate must choose the branch with largest prevotedConfirmedUptoHeight',
		);
	}
}

class BFTForkChoiceRuleError extends BFTError {
	constructor() {
		super('Violation of fork choice rule, delegate moved to a different chain');
	}
}

class BFTInvalidAttributeError extends BFTError {
	constructor() {
		super('Invalid BFT attribute');
	}
}

module.exports = {
	BFTError,
	BFTChainDisjointError,
	BFTLowerChainBranchError,
	BFTForkChoiceRuleError,
	BFTInvalidAttributeError,
};
