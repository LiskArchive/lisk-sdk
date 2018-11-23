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
 *
 */
import { expect } from 'chai';
import { NotEnoughPeersError } from '../../src';

describe('#not enough peers errors module', () => {
	let notEnoughPeersError: NotEnoughPeersError;
	const defaultMessage =
		'Requested number of peers is greater than available good peers';

	beforeEach(() => {
		notEnoughPeersError = new NotEnoughPeersError();
		return Promise.resolve();
	});

	describe('should create error object', () => {
		it('should create a new instance of NotEnoughPeersError', () => {
			return expect(notEnoughPeersError)
				.to.be.an('object')
				.and.be.instanceof(NotEnoughPeersError);
		});

		it('should set error name to `Not Enough Peers Error`', () => {
			return expect(notEnoughPeersError.name).to.eql('Not Enough Peers Error');
		});

		it('should set error message to empty string by default', () => {
			return expect(notEnoughPeersError.message).to.eql('');
		});
		it('should have a code property with a final value', () => {
			return expect(notEnoughPeersError)
				.to.be.an('object')
				.and.to.have.property('Code')
				.and.is.an('string')
				.to.be.eql('NOT_ENOUGH_PEERS');
		});
	});
	describe('should set error object properties', () => {
		beforeEach(() => {
			notEnoughPeersError = new NotEnoughPeersError(defaultMessage);
			return Promise.resolve();
		});

		it('should set error message when passed an argument', () => {
			return expect(notEnoughPeersError.message).to.eql(defaultMessage);
		});
	});
});
