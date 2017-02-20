'use strict'; /*jslint mocha:true, expr:true */

var chai = require('chai');
var express = require('express');
var _  = require('lodash');
var sinon = require('sinon');
var node = require('../../node.js');
var randomPeer = require('../../common/objectStubs').randomPeer;
var Peer = require('../../../logic/peer.js');

describe('peer', function () {

	var peer;
	before(function () {
		peer = new Peer({});
	});

	describe('accept', function () {

		it('should accept valid peer', function () {
			var __peer = peer.accept(randomPeer);
			['height', 'ip', 'port', 'state'].forEach(function (property) {
				node.expect(__peer[property]).equals(randomPeer[property]);
			});
			node.expect(__peer.string).equals(randomPeer.ip + ':' + randomPeer.port);
		});

		it('should accept empty peer and set default values', function () {
			var __peer = peer.accept({});
			node.expect(__peer.port).to.equal(0);
			node.expect(__peer.ip).to.be.undefined;
			node.expect(__peer.state).to.equal(1);
			node.expect(__peer.height).to.equal(1);
			// node.expect(__peer.string).to.equal(1);
		});
	});

	describe('parseInt', function () {

		it('should always return a number', function () {
			node.expect(peer.parseInt('1')).to.equal(1);
			node.expect(peer.parseInt(1)).to.equal(1);
		});

		it('should return default value when NaN passed', function () {
			node.expect(peer.parseInt('not a number', 1)).to.equal(1);
			node.expect(peer.parseInt(undefined, 1)).to.equal(1);
			node.expect(peer.parseInt(null, 1)).to.equal(1);
		});
	});

	describe('applyHeaders', function () {

		it('should not apply random values to the peer scope', function () {
			peer.applyHeaders({headerA: 'HeaderA'});
			node.expect(peer.headerA).to.not.exist;
		});

		it('should apply value defined as header', function () {
			var initialPeer = _.clone(peer);
			peer.headers.forEach(function (header) {
				delete peer[header];
				var headers = {};
				headers[header] = randomPeer[header];
				peer.applyHeaders(headers);
				node.expect(peer[header]).to.equal(randomPeer[header]);
			});

			peer = initialPeer;
		});

		it('should parse height and port', function () {
			var appliedHeaders = peer.applyHeaders({port: '4000', height: '1'});

			node.expect(appliedHeaders.port).to.equal(4000);
			node.expect(appliedHeaders.height).to.equal(1);
		});
	});

	describe('update', function () {

		it('should apply random values to the peer scope', function () {
			peer.update({someProp: 'someValue'});
			node.expect(peer.someProp).to.exist.and.equal('someValue');
			delete peer.someProp;
		});

		it('should not apply undefined to the peer scope', function () {
			peer.update({someProp: undefined});
			node.expect(peer.someProp).to.not.exist;
		});

		it('should not apply null to the peer scope', function () {
			peer.update({someProp: null});
			node.expect(peer.someProp).to.not.exist;
		});

		it('should prevent unbanning peer', function () {
			var initialState = peer.state;
			//ban peer
			peer.state = 0;
			//try to unban peer
			peer.update({state: 2});
			node.expect(peer.state).to.equal(0);
			peer.state = initialState;
		});
	});

	describe('object', function () {

		it('should create proper copy of peer', function () {
			var initialPeer = _.clone(peer);
			peer.update(randomPeer);
			peer.applyHeaders({dappid: randomPeer.dappid});
			var peerCopy = peer.object();
			_.keys(randomPeer).forEach(function (property) {
				if (peer.properties.indexOf(property) !== -1) {
					node.expect(peerCopy[property]).to.equal(randomPeer[property]);
					if (peer.nullable.indexOf(property) !== -1 && !randomPeer[property]) {
						node.expect(peerCopy[property]).to.be.null;
					}
				}
			});
			peer = initialPeer;
		});

		it('should always return state', function () {
			var initialState = peer.state;
			peer.update({state: 'unreadable'});
			var peerCopy = peer.object();
			node.expect(peerCopy.state).to.equal(1);
			peer.state = initialState;
		});
	});
});
