const async = require('async');
const expect = require('chai').expect;
const lisk = require('lisk-elements').default;
const localCommon = require('../common');
const accountFixtures = require('../../fixtures/accounts');
const randomUtil = require('../../common/utils/random');

const exceptions = global.exceptions;

describe('inert transactions', () => {
	let library;
	const senderAccount = accountFixtures.genesis;
	const recipientAccount = randomUtil.account();
	const transferInertTransaction = lisk.transaction.transfer({
		recipientId: recipientAccount.address,
		amount: 1000000000 * 100,
		passphrase: senderAccount.passphrase,
	});

	const voteInertTransaction = lisk.transaction.castVotes({
		passphrase: recipientAccount.passphrase,
		votes: [`${accountFixtures.existingDelegate.publicKey}`],
	});

	const delegateInertTransaction = lisk.transaction.registerDelegate({
		passphrase: recipientAccount.passphrase,
		username: recipientAccount.username,
	});

	exceptions.inertTransactions = [
		transferInertTransaction.id,
		voteInertTransaction.id,
		delegateInertTransaction.id,
	];

	localCommon.beforeBlock('system_inert_transactions', lib => {
		library = lib;
	});

	describe('send funds to account', () => {
		before(done => {
			const transferTransaction = lisk.transaction.transfer({
				recipientId: recipientAccount.address,
				amount: 5000000000 * 100,
				passphrase: senderAccount.passphrase,
			});
			localCommon.addTransactionsAndForge(library, [transferTransaction], done);
		});

		describe('getting account before inert transaction', () => {
			let beforeBlockSenderMemAccount;
			let beforeBlockRecipientMemAccount;

			before('get sender and recipient accounts', done => {
				async.parallel(
					[
						parallelCb => {
							library.logic.account.get(
								{ address: senderAccount.address },
								(err, res) => {
									beforeBlockSenderMemAccount = res;
									parallelCb();
								}
							);
						},
						parallelCb => {
							library.logic.account.get(
								{ address: recipientAccount.address },
								(err, res) => {
									beforeBlockRecipientMemAccount = res;
									parallelCb();
								}
							);
						},
					],
					done
				);
			});

			describe('when forging block with inert type 0 transaction', () => {
				const inertTransaction = transferInertTransaction;

				before(done => {
					localCommon.addTransactionsAndForge(
						library,
						[inertTransaction],
						done
					);
				});

				describe('details of the accounts', () => {
					let afterBlockSenderMemAccount;
					let afterBlockRecipientMemAccount;

					before('get sender and recipient accounts', done => {
						async.parallel(
							[
								parallelCb => {
									library.logic.account.get(
										{ address: senderAccount.address },
										(err, res) => {
											afterBlockSenderMemAccount = res;
											parallelCb();
										}
									);
								},
								parallelCb => {
									library.logic.account.get(
										{ address: recipientAccount.address },
										(err, res) => {
											afterBlockRecipientMemAccount = res;
											parallelCb();
										}
									);
								},
							],
							done
						);
					});

					it('should not update u_balance field of sender account', () => {
						return expect(beforeBlockSenderMemAccount.u_balance).to.equal(
							afterBlockSenderMemAccount.u_balance
						);
					});

					it('should not update balance field of sender account', () => {
						return expect(beforeBlockSenderMemAccount.balance).to.equal(
							afterBlockSenderMemAccount.balance
						);
					});

					it('should not update u_balance field of recipient account', () => {
						return expect(beforeBlockRecipientMemAccount.u_balance).to.equal(
							afterBlockRecipientMemAccount.u_balance
						);
					});

					it('should not update balance field of recipient account', () => {
						return expect(beforeBlockRecipientMemAccount.balance).to.equal(
							afterBlockRecipientMemAccount.balance
						);
					});
				});

				describe('transactions table', () => {
					let transactionFromDatabase;

					before('get transaction from database', done => {
						localCommon.getTransactionFromModule(
							library,
							{
								id: inertTransaction.id,
							},
							(err, res) => {
								expect(err).to.not.exist;
								transactionFromDatabase = res.transactions[0];
								done();
							}
						);
					});

					it('should save transaction in the database', () => {
						expect(transactionFromDatabase).to.be.an('Object');
						return expect(transactionFromDatabase.id).to.equal(
							inertTransaction.id
						);
					});
				});

				describe('after deleting block', () => {
					let afterDeleteSenderMemAccount;
					let afterDeleteRecipientMemAccount;

					before('deleting block', done => {
						localCommon.deleteLastBlock(library, done);
					});

					describe('details of the account', () => {
						before('get sender and recipient accounts', done => {
							async.parallel(
								[
									parallelCb => {
										library.logic.account.get(
											{ address: senderAccount.address },
											(err, res) => {
												afterDeleteSenderMemAccount = res;
												parallelCb();
											}
										);
									},
									parallelCb => {
										library.logic.account.get(
											{ address: recipientAccount.address },
											(err, res) => {
												afterDeleteRecipientMemAccount = res;
												parallelCb();
											}
										);
									},
								],
								done
							);
						});

						it('should not update u_balance field of sender account', () => {
							return expect(afterDeleteSenderMemAccount.u_balance).to.equal(
								beforeBlockSenderMemAccount.u_balance
							);
						});

						it('should not update balance field of sender account', () => {
							return expect(afterDeleteSenderMemAccount.balance).to.equal(
								beforeBlockSenderMemAccount.balance
							);
						});

						it('should not update u_balance field of recipient account', () => {
							return expect(afterDeleteRecipientMemAccount.u_balance).to.equal(
								beforeBlockRecipientMemAccount.u_balance
							);
						});

						it('should not update balance field of recipient account', () => {
							return expect(afterDeleteRecipientMemAccount.balance).to.equal(
								beforeBlockRecipientMemAccount.balance
							);
						});
					});

					describe('transactions table', () => {
						let transactionsFilteredById;

						before('get transaction from database', done => {
							localCommon.getTransactionFromModule(
								library,
								{
									id: inertTransaction.id,
								},
								(err, res) => {
									expect(err).to.not.exist;
									transactionsFilteredById = res.transactions;
									done();
								}
							);
						});

						it('should delete transaction from the database', () => {
							expect(transactionsFilteredById).to.be.an('Array');
							return expect(transactionsFilteredById).to.have.length(0);
						});
					});
				});
			});

			describe('when forging block with inert type 2 transaction', () => {
				const inertTransaction = delegateInertTransaction;

				before(done => {
					localCommon.addTransactionsAndForge(
						library,
						[inertTransaction],
						done
					);
				});

				describe('details of the accounts', () => {
					let afterBlockRecipientMemAccount;

					before('get recipient account', done => {
						library.logic.account.get(
							{ address: recipientAccount.address },
							(err, res) => {
								afterBlockRecipientMemAccount = res;
								done();
							}
						);
					});

					it('should not update u_balance field of recipient account', () => {
						return expect(beforeBlockRecipientMemAccount.u_balance).to.equal(
							afterBlockRecipientMemAccount.u_balance
						);
					});

					it('should not update balance field of recipient account', () => {
						return expect(beforeBlockRecipientMemAccount.balance).to.equal(
							afterBlockRecipientMemAccount.balance
						);
					});

					it('should not have username property set', () => {
						return expect(afterBlockRecipientMemAccount.username).to.not.exist;
					});

					it('should have isDelegate set to false', () => {
						return expect(afterBlockRecipientMemAccount.isDelegate).to.equal(
							false
						);
					});
				});

				describe('transactions table', () => {
					let transactionFromDatabase;

					before('get transaction from database', done => {
						localCommon.getTransactionFromModule(
							library,
							{
								id: inertTransaction.id,
							},
							(err, res) => {
								expect(err).to.not.exist;
								transactionFromDatabase = res.transactions[0];
								done();
							}
						);
					});

					it('should save transaction in the database', () => {
						expect(transactionFromDatabase).to.be.an('Object');
						return expect(transactionFromDatabase.id).to.equal(
							inertTransaction.id
						);
					});
				});

				describe('after deleting block', () => {
					let afterDeleteRecipientMemAccount;

					before('deleting block', done => {
						localCommon.deleteLastBlock(library, done);
					});

					describe('details of the accounts', () => {
						before('get recipient account', done => {
							library.logic.account.get(
								{ address: recipientAccount.address },
								(err, res) => {
									afterDeleteRecipientMemAccount = res;
									done();
								}
							);
						});

						it('should not update u_balance field of recipient account', () => {
							return expect(afterDeleteRecipientMemAccount.u_balance).to.equal(
								beforeBlockRecipientMemAccount.u_balance
							);
						});

						it('should not update balance field of recipient account', () => {
							return expect(afterDeleteRecipientMemAccount.balance).to.equal(
								beforeBlockRecipientMemAccount.balance
							);
						});

						it('should not have username property set', () => {
							return expect(afterDeleteRecipientMemAccount.username).to.not
								.exist;
						});

						it('should have isDelegate set to false', () => {
							return expect(afterDeleteRecipientMemAccount.isDelegate).to.equal(
								false
							);
						});
					});

					describe('transactions table', () => {
						let transactionsFilteredById;

						before('get transaction from database', done => {
							localCommon.getTransactionFromModule(
								library,
								{
									id: inertTransaction.id,
								},
								(err, res) => {
									expect(err).to.not.exist;
									transactionsFilteredById = res.transactions;
									done();
								}
							);
						});

						it('should delete transaction from the database', () => {
							expect(transactionsFilteredById).to.be.an('Array');
							return expect(transactionsFilteredById).to.have.length(0);
						});
					});
				});
			});
			describe('when forging block with inert type 3 transaction', () => {
				const inertTransaction = voteInertTransaction;

				before(done => {
					localCommon.addTransactionsAndForge(
						library,
						[inertTransaction],
						done
					);
				});

				describe('details of the accounts', () => {
					let afterBlockRecipientMemAccount;

					before('get recipient account', done => {
						library.logic.account.get(
							{ address: recipientAccount.address },
							(err, res) => {
								afterBlockRecipientMemAccount = res;
								done();
							}
						);
					});

					it('should not update u_balance field of recipient account', () => {
						return expect(beforeBlockRecipientMemAccount.u_balance).to.equal(
							afterBlockRecipientMemAccount.u_balance
						);
					});

					it('should not update balance field of recipient account', () => {
						return expect(beforeBlockRecipientMemAccount.balance).to.equal(
							afterBlockRecipientMemAccount.balance
						);
					});

					it('should not update delegates array for account', () => {
						return expect(beforeBlockRecipientMemAccount.delegates).to.eql(
							afterBlockRecipientMemAccount.delegates
						);
					});
				});

				describe('transactions table', () => {
					let transactionFromDatabase;

					before('get transaction from database', done => {
						localCommon.getTransactionFromModule(
							library,
							{
								id: inertTransaction.id,
							},
							(err, res) => {
								expect(err).to.not.exist;
								transactionFromDatabase = res.transactions[0];
								done();
							}
						);
					});

					it('should save transaction in the database', () => {
						expect(transactionFromDatabase).to.be.an('Object');
						return expect(transactionFromDatabase.id).to.equal(
							inertTransaction.id
						);
					});
				});

				describe('after deleting block', () => {
					before('deleting block', done => {
						localCommon.deleteLastBlock(library, done);
					});

					describe('details of the accounts', () => {
						let afterDeleteRecipientMemAccount;

						before('get recipient account', done => {
							library.logic.account.get(
								{ address: recipientAccount.address },
								(err, res) => {
									afterDeleteRecipientMemAccount = res;
									done();
								}
							);
						});

						it('should not update u_balance field of recipient account', () => {
							return expect(afterDeleteRecipientMemAccount.u_balance).to.equal(
								beforeBlockRecipientMemAccount.u_balance
							);
						});

						it('should not update balance field of recipient account', () => {
							return expect(afterDeleteRecipientMemAccount.balance).to.equal(
								beforeBlockRecipientMemAccount.balance
							);
						});

						it('should not update delegates array for account', () => {
							return expect(afterDeleteRecipientMemAccount.delegates).to.eql(
								beforeBlockRecipientMemAccount.delegates
							);
						});
					});

					describe('transactions table', () => {
						let transactionsFilteredById;

						before('get transaction from database', done => {
							localCommon.getTransactionFromModule(
								library,
								{
									id: inertTransaction.id,
								},
								(err, res) => {
									expect(err).to.not.exist;
									transactionsFilteredById = res.transactions;
									done();
								}
							);
						});

						it('should delete transaction from the database', () => {
							expect(transactionsFilteredById).to.be.an('Array');
							return expect(transactionsFilteredById).to.have.length(0);
						});
					});
				});
			});
		});
	});
});
