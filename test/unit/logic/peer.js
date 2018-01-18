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

var express = require('express');
var ip = require('ip');

var prefixedPeer = require('../../fixtures/peers').randomNormalizedPeer;
var Peer = require('../../../logic/peer.js');

describe('peer', function () {

	var peer;

	beforeEach(function () {
		peer = new Peer({});
	});

	describe('constructor', function () {

		it('should create Peer with all properties implemented', function () {
			var __peer = new Peer({ip: '127.0.0.1', wsPort: 4000});
			__peer.should.have.property('ip').equal('127.0.0.1');
			__peer.should.have.property('wsPort').equal(4000);
			__peer.should.have.property('state').equal(1);
			__peer.should.have.property('string').equal('127.0.0.1:4000');
		});
	});

	describe('accept', function () {

		it('should accept valid peer', function () {
			var peer = new Peer({});
			var __peer = peer.accept(prefixedPeer);
			['height', 'ip', 'wsPort', 'state'].forEach(function (property) {
				__peer[property].should.equals(prefixedPeer[property]);
			});
			__peer.string.should.equals(prefixedPeer.ip + ':' + prefixedPeer.wsPort);
		});

		it('should accept empty peer and set default values', function () {
			var __peer = peer.accept({});
			__peer.wsPort.should.equal(0);
			should.not.exist(__peer.ip);
			__peer.state.should.equal(1);
			should.not.exist(__peer.height);
			should.not.exist(__peer.string);
		});

		it('should accept peer with ip as long', function () {
			var __peer = peer.accept({ip: ip.toLong(prefixedPeer.ip)});
			__peer.ip.should.equal(prefixedPeer.ip);
		});
	});

	describe('parseInt', function () {

		it('should always return a number', function () {
			peer.parseInt('1').should.equal(1);
			peer.parseInt(1).should.equal(1);
		});

		it('should return default value when NaN passed', function () {
			peer.parseInt('not a number', 1).should.equal(1);
			peer.parseInt(undefined, 1).should.equal(1);
			peer.parseInt(null, 1).should.equal(1);
		});
	});

	describe('applyHeaders', function () {

		it('should not apply random values to the peer scope', function () {
			peer.applyHeaders({headerA: 'HeaderA'});
			should.not.exist(peer.headerA);
		});

		it('should apply defined values as headers', function () {
			peer.headers.forEach(function (header) {
				delete peer[header];
				if (prefixedPeer[header]) {
					var headers = {};
					headers[header] = prefixedPeer[header];
					peer.applyHeaders(headers);
					peer[header].should.equal(prefixedPeer[header]);
				}
			});
		});

		it('should not apply nulls or undefined values as headers', function () {
			peer.headers.forEach(function (header) {
				delete peer[header];
				if (prefixedPeer[header] === null || prefixedPeer[header] === undefined) {
					var headers = {};
					headers[header] = prefixedPeer[header];
					peer.applyHeaders(headers);
					should.not.exist(peer[header]);
				}
			});
		});

		it('should parse height and port', function () {
			var appliedHeaders = peer.applyHeaders({wsPort: '4000', height: '1'});

			appliedHeaders.wsPort.should.equal(4000);
			appliedHeaders.height.should.equal(1);
		});
	});

	describe('update', function () {

		it('should not apply random values to the peer scope', function () {
			peer.update({someProp: 'someValue'});
			should.not.exist(peer.someProp);
		});

		it('should not apply undefined to the peer scope', function () {
			peer.update({someProp: undefined});
			should.not.exist(peer.someProp);
		});

		it('should not apply null to the peer scope', function () {
			peer.update({someProp: null});
			should.not.exist(peer.someProp);
		});

		it('should change state of banned peer', function () {
			var initialState = peer.state;
			// Ban peer
			peer.state = 0;
			// Try to unban peer
			peer.update({state: 2});
			peer.state.should.equal(2);
			peer.state = initialState;
		});

		it('should change state of banned peer', function () {
			var initialState = peer.state;
			// Ban peer
			peer.state = 0;
			// Try to unban peer
			peer.update({state: 2});
			peer.state.should.equal(2);
			peer.state = initialState;
		});

		it('should update defined values', function () {
			var updateData = {
				os: 'test os',
				version: '0.0.0',
				broadhash: 'test broadhash',
				height: 3,
				nonce: 'ABCD123'
			};
			_.difference(_.keys(updateData), peer.headers).should.have.lengthOf(0);
			peer.update(updateData);
			peer.headers.forEach(function (header) {
				peer[header].should.exist.and.equals(updateData[header]);
			});
		});

		it('should not update immutable properties', function () {
			var peerBeforeUpdate = _.clone(peer);
			var updateImmutableData = {
				ip: prefixedPeer.ip,
				wsPort: prefixedPeer.wsPort,
				httpPort: prefixedPeer.httpPort,
				string: prefixedPeer.ip + ':' + prefixedPeer.wsPort
			};

			_.isEqual(_.keys(updateImmutableData), peer.immutable).should.be.ok;
			peer.update(updateImmutableData);
			peer.headers.forEach(function (header) {
				should.equal(peer[header], peerBeforeUpdate[header]);
				should.not.equal(peer[header], updateImmutableData);
			});
		});

		it('should not delete values which were previously set but are not updated now', function () {
			var updateData = {
				os: 'test os',
				version: '0.0.0',
				dappid: ['test dappid'],
				broadhash: 'test broadhash',
				height: 3,
				nonce: 'ABCD123'
			};
			peer.update(updateData);
			var peerBeforeUpdate = _.clone(peer);
			peer.update({height: peer.height += 1});
			peer.height -= 1;
			_.isEqual(peer, peerBeforeUpdate).should.be.ok;
		});
	});

	describe('object', function () {

		it('should create proper copy of peer', function () {
			var __peer = new Peer(prefixedPeer);
			var peerCopy = __peer.object();
			_.keys(prefixedPeer).forEach(function (property) {
				if (__peer.properties.indexOf(property) !== -1) {
					if (typeof prefixedPeer[property] !== 'object') {
						peerCopy[property].should.equal(prefixedPeer[property]);
					}
				}
			});
		});

		it('should always return state', function () {
			var initialState = peer.state;
			peer.update({state: 'unreadable'});
			var peerCopy = peer.object();
			peerCopy.state.should.equal(1);
			peer.state = initialState;
		});

	});
});
