/*
 * Copyright © 2017 Lisk Foundation
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
import {
	AccountsResource,
	BlocksResource,
	DappsResource,
	DelegatesResource,
	NodeResource,
	PeersResource,
	SignaturesResource,
	TransactionsResource,
	VotersResource,
	VotesResource,
} from 'api/resources';

describe('resources index.js', () => {
	describe('#constructor', () => {
		it('should export AccountsResource', () => {
			return AccountsResource.should.be.a('function');
		});

		it('should export BlocksResource', () => {
			return BlocksResource.should.be.a('function');
		});

		it('should export DappsResource', () => {
			return DappsResource.should.be.a('function');
		});

		it('should export DelegatesResource', () => {
			return DelegatesResource.should.be.a('function');
		});

		it('should export NodeResource', () => {
			return NodeResource.should.be.a('function');
		});

		it('should export PeersResource', () => {
			return PeersResource.should.be.a('function');
		});

		it('should export SignaturesResource', () => {
			return SignaturesResource.should.be.a('function');
		});

		it('should export TransactionsResource', () => {
			return TransactionsResource.should.be.a('function');
		});

		it('should export VotersResource', () => {
			return VotersResource.should.be.a('function');
		});

		it('should export VotesResource', () => {
			return VotesResource.should.be.a('function');
		});
	});
});
