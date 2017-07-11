'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var express = require('express');
var ip = require('ip');
var _  = require('lodash');
var sinon = require('sinon');
var randomPeer = require('../../common/objectStubs').randomPeer;
var Peer = require('../../../logic/peer.js');

describe('peer', function () {

	var peer;

	beforeEach(function () {
		peer = new Peer({});
	});

	describe('constructor', function () {

		it('should create Peer with all properties implemented', function () {
			var __peer = new Peer({ip: '127.0.0.1', port: 4000});
			expect(__peer).to.have.property('ip').equal('127.0.0.1');
			expect(__peer).to.have.property('port').equal(4000);
			expect(__peer).to.have.property('state').equal(1);
			expect(__peer).to.have.property('string').equal('127.0.0.1:4000');
		});
	});

	describe('accept', function () {

		it('should accept valid peer', function () {
			var peer = new Peer({});
			var __peer = peer.accept(randomPeer);
			['height', 'ip', 'port', 'state'].forEach(function (property) {
				expect(__peer[property]).equals(randomPeer[property]);
			});
			expect(__peer.string).equals(randomPeer.ip + ':' + randomPeer.port);
		});

		it('should accept empty peer and set default values', function () {
			var __peer = peer.accept({});
			expect(__peer.port).to.equal(0);
			expect(__peer.ip).to.be.undefined;
			expect(__peer.state).to.equal(1);
			expect(__peer.height).to.be.undefined;
			expect(__peer.string).to.be.undefined;
		});

		it('should accept peer with ip as long', function () {
			var __peer = peer.accept({ip: ip.toLong(randomPeer.ip)});
			expect(__peer.ip).to.equal(randomPeer.ip);
		});
	});

	describe('parseInt', function () {

		it('should always return a number', function () {
			expect(peer.parseInt('1')).to.equal(1);
			expect(peer.parseInt(1)).to.equal(1);
		});

		it('should return default value when NaN passed', function () {
			expect(peer.parseInt('not a number', 1)).to.equal(1);
			expect(peer.parseInt(undefined, 1)).to.equal(1);
			expect(peer.parseInt(null, 1)).to.equal(1);
		});
	});

	describe('applyHeaders', function () {

		it('should not apply random values to the peer scope', function () {
			peer.applyHeaders({headerA: 'HeaderA'});
			expect(peer.headerA).to.not.exist;
		});

		it('should apply defined values as headers', function () {
			peer.headers.forEach(function (header) {
				delete peer[header];
				if (randomPeer[header]) {
					var headers = {};
					headers[header] = randomPeer[header];
					peer.applyHeaders(headers);
					expect(peer[header]).to.equal(randomPeer[header]);
				}
			});
		});

		it('should not apply nulls or undefined values as headers', function () {
			peer.headers.forEach(function (header) {
				delete peer[header];
				if (randomPeer[header] === null || randomPeer[header] === undefined) {
					var headers = {};
					headers[header] = randomPeer[header];
					peer.applyHeaders(headers);
					expect(peer[header]).to.not.exist;
				}
			});
		});

		it('should parse height and port', function () {
			var appliedHeaders = peer.applyHeaders({port: '4000', height: '1'});

			expect(appliedHeaders.port).to.equal(4000);
			expect(appliedHeaders.height).to.equal(1);
		});
	});

	describe('update', function () {

		it('should not apply random values to the peer scope', function () {
			peer.update({someProp: 'someValue'});
			expect(peer.someProp).to.not.exist;
		});

		it('should not apply undefined to the peer scope', function () {
			peer.update({someProp: undefined});
			expect(peer.someProp).to.not.exist;
		});

		it('should not apply null to the peer scope', function () {
			peer.update({someProp: null});
			expect(peer.someProp).to.not.exist;
		});

		it('should change state of banned peer', function () {
			var initialState = peer.state;
			// Ban peer
			peer.state = 0;
			// Try to unban peer
			peer.update({state: 2});
			expect(peer.state).to.equal(2);
			peer.state = initialState;
		});

		it('should change state of banned peer', function () {
			var initialState = peer.state;
			// Ban peer
			peer.state = 0;
			// Try to unban peer
			peer.update({state: 2});
			expect(peer.state).to.equal(2);
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
			expect(_.difference(_.keys(updateData), peer.headers)).to.have.lengthOf(0);
			peer.update(updateData);
			peer.headers.forEach(function (header) {
				expect(peer[header]).to.exist.and.equals(updateData[header]);
			});
		});

		it('should not update immutable properties', function () {
			var peerBeforeUpdate = _.clone(peer);
			var updateImmutableData = {
				ip: randomPeer.ip,
				port: randomPeer.port,
				httpPort: randomPeer.port,
				string: randomPeer.ip + ':' + randomPeer.port
			};

			expect(_.isEqual(_.keys(updateImmutableData), peer.immutable)).to.be.ok;
			peer.update(updateImmutableData);
			peer.headers.forEach(function (header) {
				expect(peer[header]).equals(peerBeforeUpdate[header]).and.not.equal(updateImmutableData);
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
			expect(_.isEqual(peer, peerBeforeUpdate)).to.be.ok;
		});
	});

	describe('object', function () {

		it('should create proper copy of peer', function () {
			var __peer = new Peer(randomPeer);
			var peerCopy = __peer.object();
			_.keys(randomPeer).forEach(function (property) {
				if (__peer.properties.indexOf(property) !== -1) {
					if (typeof randomPeer[property] !== 'object') {
						expect(peerCopy[property]).to.equal(randomPeer[property]);
					}
					if (__peer.nullable.indexOf(property) !== -1 && !randomPeer[property]) {
						expect(peerCopy[property]).to.be.null;
					}
				}
			});
		});

		it('should always return state', function () {
			var initialState = peer.state;
			peer.update({state: 'unreadable'});
			var peerCopy = peer.object();
			expect(peerCopy.state).to.equal(1);
			peer.state = initialState;
		});

	});
});
