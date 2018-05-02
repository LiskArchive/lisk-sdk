const async = require('async');
const expect = require('chai').expect;
const lisk = require('lisk-js').default;
const localCommon = require('../common');
const exceptions = require('../../../../helpers/exceptions.js');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');

describe('inert transactions', () => {
	let library;
	const senderAccount = accountFixtures.genesis;
	const recipientAccount = randomUtil.account();
	const inertTransaction = lisk.transaction.transfer({
		recipientId: recipientAccount.address,
		amount: 1000000000 * 100,
		passphrase: senderAccount.password,
	});

	exceptions.inertTransactions = [inertTransaction.id];

	localCommon.beforeBlock('system_inert_transactions', lib => {
		library = lib;
	});

	describe('create recipient account', () => {
		before(done => {
			const transferTransaction = lisk.transaction.transfer({
				recipientId: recipientAccount.address,
				amount: 5000000000 * 100,
				passphrase: senderAccount.password,
			});
			localCommon.addTransactionsAndForge(library, [transferTransaction], done);
		});

		describe('getting account before inert transaction', () => {
			let beforeBlockSenderMemAccount;
			let beforeBlockRecipientMemAccount;

			before('get sender and recipient account', done => {
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

			describe('when forging block with inert transaction', () => {
				before(done => {
					localCommon.addTransactionsAndForge(
						library,
						[inertTransaction],
						done
					);
				});

				describe('should not update balances of the accounts', () => {
					let afterBlockSenderMemAccount;
					let afterBlockRecipientMemAccount;

					before('get sender and recipient account', done => {
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

					it('should not have updated u_balance field set on sender account', () => {
						return expect(beforeBlockSenderMemAccount.u_balance).to.equal(
							afterBlockSenderMemAccount.u_balance
						);
					});

					it('should not have updated balance field set on sender account', () => {
						return expect(beforeBlockSenderMemAccount.balance).to.equal(
							afterBlockSenderMemAccount.balance
						);
					});

					it('should not have updated u_balance field set of recipient account', () => {
						return expect(beforeBlockRecipientMemAccount.u_balance).to.equal(
							afterBlockRecipientMemAccount.u_balance
						);
					});

					it('should not have updated balance field set on recipient account', () => {
						return expect(beforeBlockRecipientMemAccount.balance).to.equal(
							afterBlockRecipientMemAccount.balance
						);
					});

					describe('after deleting block', () => {
						let afterDeleteSenderMemAccount;
						let afterDeleteRecipientMemAccount;

						before('get sender and recipient account', done => {
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

						it('should not have updated u_balance field set on sender account', () => {
							expect(afterDeleteSenderMemAccount.u_balance).to.equal(
								beforeBlockSenderMemAccount.u_balance
							);
							return expect(afterDeleteSenderMemAccount.u_balance).to.equal(
								afterBlockSenderMemAccount.u_balance
							);
						});

						it('should not have updated balance field set on sender account', () => {
							expect(afterDeleteSenderMemAccount.balance).to.equal(
								beforeBlockSenderMemAccount.balance
							);
							return expect(afterDeleteSenderMemAccount.balance).to.equal(
								afterBlockSenderMemAccount.balance
							);
						});

						it('should not have updated u_balance field set of recipient account', () => {
							expect(afterDeleteRecipientMemAccount.u_balance).to.equal(
								beforeBlockRecipientMemAccount.u_balance
							);
							return expect(afterDeleteRecipientMemAccount.u_balance).to.equal(
								afterBlockRecipientMemAccount.u_balance
							);
						});

						it('should not have updated balance field set on recipient account', () => {
							expect(afterDeleteRecipientMemAccount.balance).to.equal(
								beforeBlockRecipientMemAccount.balance
							);
							return expect(afterDeleteRecipientMemAccount.balance).to.equal(
								afterBlockRecipientMemAccount.balance
							);
						});
					});
				});
			});
		});
	});
});
