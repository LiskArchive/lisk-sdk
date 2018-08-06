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
const transactionsFixtures = require('../../fixtures/index').transactions;
const transactionTypes = require('../../../helpers/transaction_types.js');

describe('multisignatures', () => {
	let __private;
	let self;
	let library;
	let validScope;
	const stubs = {};
	const data = {};
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

	describe('constructor', () => {
		it('should assign params to library', () => {
			expect(library.logger).to.eql(validScope.logger);
			expect(library.db).to.eql(validScope.db);
			expect(library.network).to.eql(validScope.network);
			expect(library.schema).to.eql(validScope.schema);
			expect(library.bus).to.eql(validScope.bus);
			expect(library.balancesSequence).to.eql(validScope.balancesSequence);
			expect(library.logic.transaction).to.eql(validScope.logic.transaction);
			expect(library.logic.account).to.eql(validScope.logic.account);
			return expect(library.logic.multisignature).to.eql(
				validScope.logic.multisignature
			);
		});

		it('should instantiate Multisignature logic with proper params', () => {
			expect(stubs.multisignature).to.have.been.calledOnce;
			return expect(stubs.multisignature).to.have.been.calledWith(
				validScope.schema,
				validScope.network,
				validScope.logic.transaction,
				validScope.logic.account,
				validScope.logger
			);
		});

		it('should call callback with result = self', () => {
			return expect(self).to.be.deep.equal(multisignaturesInstance);
		});
	});

	describe('onBind', () => {
		it('should set modules', () => {
		});
	});

	describe('__private.isValidSignature', () => {
		describe('when signature data contains publicKey', () => {
			describe('when publicKey is not present as member of multisignature account in transaction', () => {
				it('should return false', () => {
				});
			});

			describe('when publicKey is present as member of multisignature account in transaction', () => {
				describe('library.logic.transaction.verifySignature', () => {
					describe('when validation is successfull', () => {
						it('should return true', () => {
						});
					});

					describe('when validation fails', () => {
						it('should return false', () => {
						});
					});

					describe('when error is thrown', () => {
						it('should return true', () => {
						});
					});
				});
			});

			describe('when signature data contains no publicKey', () => {
				describe('library.logic.transaction.verifySignature', () => {
					describe('when membersPublicKeys is empty', () => {
						it('should return false', () => {
						});
					});

					describe('when membersPublicKeys contains 1 entry', () => {
						describe('when validation is successfull', () => {
							it('should return true', () => {
							});
						});

						describe('when validation fails', () => {
							it('should return false', () => {
							});
						});

						describe('when error is thrown', () => {
							it('should return true', () => {
							});
						});
					});

					describe('when membersPublicKeys contains 2 entries', () => {
						describe('when first entry passes validation', () => {
							describe('when second entry fails validation', () => {
								it('should return true', () => {
								});
							});

							describe('when error is thrown for second entry', () => {
								it('should return true', () => {
								});
							});
						});

						describe('when second entry passes validation', () => {
							describe('when first entry fails validation', () => {
								it('should return true', () => {
								});
							});

							describe('when error is thrown for first entry', () => {
								it('should return false', () => {
								});
							});
						});

						describe('when no entry passes validation', () => {
							it('should return false', () => {
							});
						});
					});
				});
			});
		});
	});
});
