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

'use strict';

const rewire = require('rewire');
const rewiredMultisignatures = rewire('../../../modules/multisignatures.js');

describe('multisignatures', () => {
	let __private;
	let self;
	let library;
	let validScope;
	const stubs = {};
	let multisignaturesInstance;

	function get(variable) {
		return rewiredMultisignatures.__get__(variable);
	}

	function set(variable, value) {
		return rewiredMultisignatures.__set__(variable, value);
	}

	beforeEach(done => {
		stubs.logger = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};

		stubs.networkIoSocketsEmit = sinonSandbox.stub();
		stubs.schema = sinonSandbox.stub();
		stubs.busMessage = sinonSandbox.stub();
		stubs.balancesSequence = sinonSandbox.stub();
		stubs.bind = sinonSandbox.stub();

		stubs.attachAssetType = () => {
			return { bind: stubs.bind };
		};
		stubs.verifySignature = sinonSandbox.stub();

		stubs.logic = {};
		stubs.logic.transaction = {
			attachAssetType: stubs.attachAssetType,
			verifySignature: stubs.verifySignature,
		};
		stubs.logic.account = sinonSandbox.stub();

		stubs.multisignature = sinonSandbox.stub();
		set('Multisignature', stubs.multisignature);

		stubs.logic.multisignature = new stubs.multisignature(
			stubs.schema,
			stubs.network,
			stubs.logic.transaction,
			stubs.logic.account,
			stubs.logger
		);
		stubs.multisignature.resetHistory();

		validScope = {
			logger: stubs.logger,
			db: {
				multisignatures: {},
			},
			network: { io: { sockets: { emit: stubs.networkIoSocketsEmit } } },
			schema: stubs.schema,
			bus: { message: stubs.busMessage },
			balancesSequence: stubs.balancesSequence,
			logic: stubs.logic,
		};

		stubs.modules = {
			accounts: sinonSandbox.stub(),
			transactions: sinonSandbox.stub(),
		};

		multisignaturesInstance = new rewiredMultisignatures(
			(err, __multisignatures) => {
				self = __multisignatures;
				__private = get('__private');
				library = get('library');
				self.onBind(stubs.modules);
				done();
			},
			validScope
		);
	});
});
