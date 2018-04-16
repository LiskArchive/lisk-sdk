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

const lisk = require('lisk-js').default;
const Scenarios = require('../../../../../functional/common/scenarios');

module.exports = function multisignature(params) {
	describe('RPC /postSignatures', () => {
		let scenarios;
		let multisigAccount;
		before(done => {
			scenarios = {
				regular: new Scenarios.Multisig(),
			};
			done();
		});

		describe('Create multisignature request for an account upgrade', () => {
			it('should create account with type 4', done => {
				multisigAccount = lisk.transaction.registerMultisignature({
					passphrase: scenarios.regular.account.password,
					keysgroup: scenarios.regular.keysgroup,
					lifetime: scenarios.regular.lifetime,
					minimum: scenarios.regular.minimum,
					timeOffset: -10000,
				});
				multisigAccount.signatures = [];
				expect(multisigAccount).to.include({ type: 4 });
				done();
			});
		});

		describe('Post required signature transactions', () => {
			it('should create signatures for the multisigAccount', () => {
				return scenarios.regular.members.map(member => {
					var signatureToBeNotconfirmed = lisk.transaction.utils.multiSignTransaction(
						multisigAccount,
						member.password
					);
					multisigAccount.signatures.push(signatureToBeNotconfirmed);
				});
			});

			describe('Check transaction pool for posted signatures', () => {
				it('should return multisignature transaction in pool', done => {
					done();
				});
			});
		});

		describe('Verify multisignatures transaction was added to block', () => {});

		after(done => {
			scenarios = null;
			multisigAccount = null;
			done();
		});
	});
};
