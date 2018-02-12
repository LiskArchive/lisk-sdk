/* eslint-disable mocha/no-pending-tests */
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

describe('voters', () => {
	describe('constructor', () => {
		describe('library', () => {
			it('should assign db');

			it('should assign logger');

			it('should assign schema');
		});

		it('should call callback with error = null');

		it('should call callback with result as a Voters instance');
	});

	describe('private', () => {
		describe('getDelegate', () => {
			it('should call modules.accounts.getAccount');

			it('should call modules.accounts.getAccount with query');

			it(
				'should call modules.accounts.getAccount with ["publicKey", "address", "balance"]'
			);
		});

		describe('populateVoters', () => {
			it('should call modules.accounts.getAccounts');

			it(
				'should call modules.accounts.getAccounts with {address: {$in: addresses}}'
			);

			it(
				'should call modules.accounts.getAccounts with ["address", "balance", "username", "publicKey"]'
			);
		});

		describe('getVotersForDelegates', () => {
			describe('when delegate is not defined', () => {
				it(
					'should call callback with error containing message = "No data returned"'
				);
			});

			describe('when delegate is defined', () => {
				it('should call library.db.one');

				it('should call library.db.one with sql.getVoters');

				it('should call library.db.one with {publicKey: delegate.publicKey}');

				describe('when library.db.one fails', () => {
					it('should call library.logger.error');

					it('should call library.logger.error with err.stack');

					it(
						'should call callback with error = "Failed to get voters for delegate: ${delegate.publicKey}"'
					);
				});

				describe('when library.db.one succeeds with row', () => {
					it('should call callback with error = null');

					describe('when row.accountIds exists', () => {
						it('should call callback with result = row.accountIds');
					});

					describe('when row.accountIds does not exist', () => {
						it('should call callback with result = []');
					});
				});
			});
		});
	});

	describe('shared', () => {
		describe('getVoters', () => {
			describe('when loaded = false', () => {
				it('should call callback with ApiError');

				it(
					'should call callback with ApiError containing message = "Blockchain is loading"'
				);

				it('should call callback with ApiError instance containing code = 500');
			});

			it('should call library.schema.validate');

			it('should call library.schema.validate with req.body');

			it('should call library.schema.validate with schema.getVoters');

			describe('when library.schema.validate fails', () => {
				it('should call callback with ApiError');

				it('should call callback with ApiError error message');

				it('should call callback with ApiError containing code = 400');
			});

			describe('when library.schema.validate succeeds', () => {
				var expectErrorResponse = function(error) {
					describe('when err.message = "No data returned"', () => {
						it('should call callback with error = null');

						it(
							'should call callback with result containing message = "No data returned"'
						);
					});

					describe('when err.message != "No data returned"', () => {
						it('should call callback with ApiError');

						it(`should call callback with ApiError error = ${error}`);

						it('should call callback with ApiError containing code = 500');
					});
				};

				it('should call getDelegate');

				it('should call getDelegate with req.body');

				describe('when getDelegate fails', () => {
					expectErrorResponse('getDelegate error');
				});

				describe('when getDelegate succeeds with delegate', () => {
					it('should call getVotersForDelegates');

					it('should call getVotersForDelegates with delegate');

					describe('when getVotersForDelegates fails', () => {
						expectErrorResponse('getVotersForDelegates error');
					});

					describe('when getVotersForDelegates succeeds with addresses', () => {
						it('should call populateVoters');

						it('should call populateVoters with addresses');

						describe('when populateVoters fails', () => {
							expectErrorResponse('getVotersForDelegates error');
						});

						describe('when populateVoters succeeds with addresses', () => {
							it('should call populateVoters');

							it('should call populateVoters with addresses');

							describe('when populateVoters fails', () => {
								expectErrorResponse('populateVoters error');
							});

							describe('when populateVoters succeeds with voters', () => {
								it('should call callback with error = null');

								it('should call callback with result containing publicKey');

								it('should call callback with result containing address');

								it('should call callback with result containing balance');

								describe('when voters = []', () => {
									it('should call callback with result containing voters = []');

									it('should call callback with result containing votes = 0');
								});

								describe('when voters is an array with result', () => {
									it(
										'should call callback with result containing voters.0.address'
									);

									it(
										'should call callback with result containing voters.0.balance'
									);

									it(
										'should call callback with result containing voters.0.username'
									);

									it(
										'should call callback with result containing voters.0.publicKey'
									);

									it('should call callback with result containing votes = 1');
								});
							});
						});
					});
				});
			});
		});
	});

	describe('onBind', () => {
		describe('modules', () => {
			it('should assign accounts');
		});

		it('should assign loaded = true');
	});
});
