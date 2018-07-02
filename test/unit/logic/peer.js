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

var ip = require('ip');
var prefixedPeer = require('../../fixtures/peers').randomNormalizedPeer;
var Peer = require('../../../logic/peer.js');

describe('peer', () => {
	var peer;

	beforeEach(done => {
		peer = new Peer({});
		done();
	});

	describe('constructor', () => {
		it('should create Peer with all properties implemented', () => {
			var __peer = new Peer({ ip: '127.0.0.1', wsPort: 4000 });
			expect(__peer)
				.to.have.property('ip')
				.equal('127.0.0.1');
			expect(__peer)
				.to.have.property('wsPort')
				.equal(4000);
			expect(__peer)
				.to.have.property('state')
				.equal(1);
			return expect(__peer)
				.to.have.property('string')
				.equal('127.0.0.1:4000');
		});
	});

	describe('accept', () => {
		it('should accept valid peer', () => {
			var peer = new Peer({});
			var __peer = peer.accept(prefixedPeer);
			['height', 'ip', 'wsPort', 'state'].forEach(property => {
				expect(__peer[property]).equals(prefixedPeer[property]);
			});
			return expect(__peer.string).equals(
				`${prefixedPeer.ip}:${prefixedPeer.wsPort}`
			);
		});

		it('should accept empty peer and set default values', () => {
			var __peer = peer.accept({});
			expect(__peer.wsPort).to.equal(0);
			expect(__peer.ip).to.be.undefined;
			expect(__peer.state).to.equal(1);
			expect(__peer.height).to.be.undefined;
			return expect(__peer.string).to.be.undefined;
		});

		it('should accept peer with ip as long', () => {
			var __peer = peer.accept({ ip: ip.toLong(prefixedPeer.ip) });
			return expect(__peer.ip).to.equal(prefixedPeer.ip);
		});
	});

	describe('parseInt', () => {
		it('should always return a number', () => {
			expect(peer.parseInt('1')).to.equal(1);
			return expect(peer.parseInt(1)).to.equal(1);
		});

		it('should return default value when NaN passed', () => {
			expect(peer.parseInt('not a number', 1)).to.equal(1);
			expect(peer.parseInt(undefined, 1)).to.equal(1);
			return expect(peer.parseInt(null, 1)).to.equal(1);
		});
	});

	describe('applyHeaders', () => {
		it('should not apply random values to the peer scope', () => {
			peer.applyHeaders({ headerA: 'HeaderA' });
			return expect(peer.headerA).to.not.exist;
		});

		it('should apply defined values as headers', () => {
			return peer.headers.forEach(header => {
				delete peer[header];
				if (prefixedPeer[header]) {
					var headers = {};
					headers[header] = prefixedPeer[header];
					peer.applyHeaders(headers);
					expect(peer[header]).to.equal(prefixedPeer[header]);
				}
			});
		});

		it('should not apply nulls or undefined values as headers', () => {
			return peer.headers.forEach(header => {
				delete peer[header];
				if (
					prefixedPeer[header] === null ||
					prefixedPeer[header] === undefined
				) {
					var headers = {};
					headers[header] = prefixedPeer[header];
					peer.applyHeaders(headers);
					expect(peer[header]).to.not.exist;
				}
			});
		});

		it('should parse height and port', () => {
			var appliedHeaders = peer.applyHeaders({ wsPort: '4000', height: '1' });

			expect(appliedHeaders.wsPort).to.equal(4000);
			return expect(appliedHeaders.height).to.equal(1);
		});
	});

	describe('update', () => {
		it('should not apply random values to the peer scope', () => {
			peer.update({ someProp: 'someValue' });
			return expect(peer.someProp).to.not.exist;
		});

		it('should not apply undefined to the peer scope', () => {
			peer.update({ someProp: undefined });
			return expect(peer.someProp).to.not.exist;
		});

		it('should not apply null to the peer scope', () => {
			peer.update({ someProp: null });
			return expect(peer.someProp).to.not.exist;
		});

		it('should change state of banned peer', done => {
			var initialState = peer.state;
			// Ban peer
			peer.state = 0;
			// Try to unban peer
			peer.update({ state: 2 });
			expect(peer.state).to.equal(2);
			peer.state = initialState;
			done();
		});

		it('should update defined values', () => {
			var updateData = {
				os: 'test os',
				version: '0.0.0',
				broadhash: 'test broadhash',
				height: 3,
				nonce: 'ABCD123',
			};
			expect(_.difference(_.keys(updateData), peer.headers)).to.have.lengthOf(
				0
			);
			peer.update(updateData);
			return peer.headers.forEach(header => {
				expect(peer[header]).to.exist.and.equals(updateData[header]);
			});
		});

		it('should not update required properties once peer is created', () => {
			var peerBeforeUpdate = _.clone(peer);
			var updateRequiredData = {
				ip: prefixedPeer.ip,
				wsPort: prefixedPeer.wsPort,
				string: `${prefixedPeer.ip}:${prefixedPeer.wsPort}`,
			};

			expect(_.isEqual(_.keys(updateRequiredData), peer.required)).to.be.ok;
			peer.update(updateRequiredData);
			return peer.headers.forEach(header => {
				expect(peer[header])
					.equals(peerBeforeUpdate[header])
					.and.not.equal(updateRequiredData);
			});
		});

		it('should update the optional properties only for the first time', () => {
			var updateOptionalData = {
				httpPort: prefixedPeer.httpPort,
				nonce: 'nonce added first time after peer creation',
			};
			var updateOptionalDataForSecondTime = {
				httpPort: 10909,
				nonce: 'update after nonce exists should fail',
			};

			expect(_.isEqual(_.keys(updateOptionalData), peer.optional)).to.be.ok;
			expect(_.isEqual(_.keys(updateOptionalDataForSecondTime), peer.optional))
				.to.be.ok;

			peer.update(updateOptionalData);
			expect(peer).to.include(updateOptionalData);

			peer.update(updateOptionalDataForSecondTime);
			return expect(peer).to.not.include(updateOptionalDataForSecondTime);
		});

		it('should not delete values which were previously set but are not updated now', () => {
			var updateData = {
				os: 'test os',
				version: '0.0.0',
				dappid: ['test dappid'],
				broadhash: 'test broadhash',
				height: 3,
				nonce: 'ABCD123',
			};
			peer.update(updateData);
			var peerBeforeUpdate = _.clone(peer);
			peer.update({ height: (peer.height += 1) });
			peer.height -= 1;
			return expect(_.isEqual(peer, peerBeforeUpdate)).to.be.ok;
		});
	});

	describe('object', () => {
		it('should create proper copy of peer', () => {
			var __peer = new Peer(prefixedPeer);
			var peerCopy = __peer.object();
			return _.keys(prefixedPeer).forEach(property => {
				if (__peer.properties.indexOf(property) !== -1) {
					if (typeof prefixedPeer[property] !== 'object') {
						expect(peerCopy[property]).to.equal(prefixedPeer[property]);
					}
				}
			});
		});

		it('should always return state', done => {
			var initialState = peer.state;
			peer.update({ state: 'unreadable' });
			var peerCopy = peer.object();
			expect(peerCopy.state).to.equal(1);
			peer.state = initialState;
			done();
		});
	});
});
