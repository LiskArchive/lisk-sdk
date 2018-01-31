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

describe('multisignatures', () => {
	describe('constructor', () => {
		describe('library', () => {
			it('should assign logger');

			it('should assign db');

			it('should assign network');

			it('should assign schema');

			it('should assign ed');

			it('should assign bus');

			it('should assign balancesSequence');

			it('should assign logic.transaction');
		});

		describe('__private', () => {
			it('should call library.logic.transaction.attachAssetType');

			it('assign __private.assetTypes[transactionTypes.MULTI]');
		});

		it('should return error = null');

		it('should return Multisignature instance');
	});

	describe('processSignature', () => {
		function continueSignatureProcessing() {
			it('should call library.balancesSequence.add');

			it('should call modules.transactions.getMultisignatureTransaction');

			it(
				'should call modules.transactions.getMultisignatureTransaction with transaction.transaction'
			);

			describe('when multisignature transaction.transaction does not exist', () => {
				it('should call callback with error = "Transaction not found"');
			});

			describe('when multisignature transaction.transaction exists', () => {
				it('should call modules.accounts.getAccount');

				it(
					'should call modules.accounts.getAccount with {address: transaction.senderId}'
				);

				describe('when modules.accounts.getAccount fails', () => {
					it('should call callback with error');
				});

				describe('when modules.accounts.getAccount succeeds', () => {
					describe('when sender does not exist', () => {
						it('should call callback with error = "Sender not found"');
					});

					describe('when sender exists', () => {
						it('should call Multisignature.prototype.ready');

						it(
							'should call Multisignature.prototype.ready with multisignature with signatures containing transaction.signature'
						);

						it('should call Multisignature.prototype.ready with sender');

						it('should call library.bus.message');

						it('should call library.bus.message with "signature"');

						it(
							'should call library.bus.message with {transaction: transaction.transaction, signature: transaction.signature}'
						);

						it('should call library.bus.message with true');

						it('should call callback with error = undefined');

						it('should call callback with result = undefined');
					});
				});
			});
		}

		describe('when no transaction passed', () => {
			it(
				'should call callback with error = "Unable to process signature. Signature is undefined."'
			);
		});

		describe('when transaction passed', () => {
			it('should call modules.transactions.getMultisignatureTransaction');

			it(
				'should call modules.transactions.getMultisignatureTransaction with transaction.transaction'
			);

			describe('when multisignature transaction.transaction does not exist', () => {
				it('should call callback with error = "Transaction not found"');
			});

			describe('when multisignature transaction.transaction exists', () => {
				describe('when transaction type != transactionTypes.MULTI', () => {
					it('should call modules.accounts.getAccount');

					it(
						'should call modules.accounts.getAccount with {address: transaction.senderId}'
					);

					describe('when modules.accounts.getAccount fails', () => {
						it(
							'should call callback with error = "Multisignature account not found"'
						);
					});

					describe('when modules.accounts.getAccount succeeds', () => {
						describe('when account does not exist', () => {
							it(
								'should call callback with error = "Account account not found"'
							);
						});

						describe('when account exists', () => {
							describe('when multisignature already contains transaction.signature', () => {
								it(
									'should call callback with error = "Signature already exists"'
								);
							});

							describe('for every account.multisignatures', () => {
								it('should call library.logic.transaction.verifySignature');

								it(
									'should call library.logic.transaction.verifySignature with multisignature'
								);

								it(
									'should call library.logic.transaction.verifySignature with account.multisignatures'
								);

								it(
									'should call library.logic.transaction.verifySignature with transaction.signature'
								);

								describe('when library.logic.transaction.verifySignature throws', () => {
									it('should call library.logger.error');

									it('should call library.logger.error with error stack');

									it(
										'should call callback with error = "Failed to verify signature"'
									);
								});

								describe('when library.logic.transaction.verifySignature returns false', () => {
									it(
										'should call callback with error = "Failed to verify signature"'
									);
								});

								describe('when library.logic.transaction.verifySignature returns true', () => {
									continueSignatureProcessing();
								});
							});
						});
					});
				});

				describe('when multisignature transaction type = transactionTypes.MULTI', () => {
					describe('when multisignature is already signed', () => {
						it(
							'should call callback with error = "Permission to sign transaction denied"'
						);
					});

					describe('when multisignature already contains transaction.signature', () => {
						it(
							'should call callback with error = "Permission to sign transaction denied"'
						);
					});

					describe('for every multisignature keysgroup member', () => {
						it('should call library.logic.transaction.verifySignature');

						it(
							'should call library.logic.transaction.verifySignature with multisignature'
						);

						it(
							'should call library.logic.transaction.verifySignature with keysgroup member'
						);

						it(
							'should call library.logic.transaction.verifySignature with transaction.signature'
						);

						describe('when library.logic.transaction.verifySignature throws', () => {
							it('should call library.logger.error');

							it('should call library.logger.error with error stack');

							it(
								'should call callback with error = "Failed to verify signature"'
							);
						});

						describe('when library.logic.transaction.verifySignature returns false', () => {
							it(
								'should call callback with error = "Failed to verify signature"'
							);
						});

						describe('when library.logic.transaction.verifySignature returns true', () => {
							continueSignatureProcessing();
						});
					});
				});
			});
		});
	});

	describe('getGroup', () => {
		it('should accept address as parameter');

		it('should fail if wrong address is provided');

		it('should fail if valid address but not a multisig account');

		it('should return a group if provided with a valid multisig account');
	});

	describe('isLoaded', () => {
		it('should return true if modules exists');

		it('should return true if modules does not exist');
	});

	describe('onBind', () => {
		describe('modules', () => {
			it('should assign accounts');

			it('should assign transactions');
		});

		describe('assetTypes', () => {
			it('should call bind on multisignature logic with scope.accounts');
		});
	});

	describe('shared', () => {
		describe('getGroups', () => {
			it('should accept fitlers.address parameter');

			describe('when schema validation fails', () => {
				it('should call callback with schema error');
			});

			describe('when schema validation succeeds', () => {
				it('should call library.db.one');

				it('should call library.db.one with sql.getAccountIds');

				it('should call library.db.one with { publicKey: req.body.publicKey }');

				describe('when library.db.one fails', () => {
					it('should call the logger.error with error stack');

					it('should call callback with "Multisignature#getAccountIds error"');
				});

				describe('when library.db.one succeeds', () => {
					it('should call modules.accounts.getAccounts');

					it(
						'should call modules.accounts.getAccounts with {address: {$in: scope.accountIds}, sort: "balance"}'
					);

					it(
						'should call modules.accounts.getAccounts with ["address", "balance", "multisignatures", "multilifetime", "multimin"]'
					);

					describe('when modules.accounts.getAccounts fails', () => {
						it('should call callback with error');
					});

					describe('when modules.accounts.getAccounts succeeds', () => {
						describe('for every account', () => {
							describe('for every account.multisignature', () => {
								it('should call modules.accounts.generateAddressByPublicKey');

								it(
									'should call modules.accounts.generateAddressByPublicKey with multisignature'
								);
							});

							it('should call modules.accounts.getAccounts');

							it(
								'should call modules.accounts.getAccounts with {address: { $in: addresses }'
							);

							it(
								'should call modules.accounts.getAccounts with ["address", "publicKey", "balance"]'
							);

							describe('when modules.accounts.getAccounts fails', () => {
								it('should call callback with error');
							});

							describe('when modules.accounts.getAccounts succeeds', () => {
								it('should call callback with error = null');

								it('should call callback with result containing accounts');
							});
						});
					});
				});
			});
		});

		describe('getMemberships', () => {
			it('should accept fitlers.address parameter');

			describe('when schema validation fails', () => {
				it('should call callback with schema error');
			});

			describe('when schema validation succeeds', () => {
				it('should call library.db.one');

				it('should call library.db.one with sql.getAccountIds');

				it('should call library.db.one with { publicKey: req.body.publicKey }');

				describe('when library.db.one fails', () => {
					it('should call the logger.error with error stack');

					it('should call callback with "Multisignature#getAccountIds error"');
				});

				describe('when library.db.one succeeds', () => {
					it('should call modules.accounts.getAccounts');

					it(
						'should call modules.accounts.getAccounts with {address: {$in: scope.accountIds}, sort: "balance"}'
					);

					it(
						'should call modules.accounts.getAccounts with ["address", "balance", "multisignatures", "multilifetime", "multimin"]'
					);

					describe('when modules.accounts.getAccounts fails', () => {
						it('should call callback with error');
					});

					describe('when modules.accounts.getAccounts succeeds', () => {
						describe('for every account', () => {
							describe('for every account.multisignature', () => {
								it('should call modules.accounts.generateAddressByPublicKey');

								it(
									'should call modules.accounts.generateAddressByPublicKey with multisignature'
								);
							});

							it('should call modules.accounts.getAccounts');

							it(
								'should call modules.accounts.getAccounts with {address: { $in: addresses }'
							);

							it(
								'should call modules.accounts.getAccounts with ["address", "publicKey", "balance"]'
							);

							describe('when modules.accounts.getAccounts fails', () => {
								it('should call callback with error');
							});

							describe('when modules.accounts.getAccounts succeeds', () => {
								it('should call callback with error = null');

								it('should call callback with result containing accounts');
							});
						});
					});
				});
			});
		});
	});
});
