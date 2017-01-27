'use strict'; /*jslint mocha:true, expr:true */

var chai = require('chai');
var express = require('express');
var sinon = require('sinon');
var node = require('../../node.js');

var clearDatabaseTable = require('../../common/globalBefore').clearDatabaseTable;
var modulesLoader = require('../../common/initModule').modulesLoader;
var Peer = require('../../../logic/peer');
var Peers = require('../../../modules/peers');
var PeerSweeper  = require('../../../logic/peerSweeper');

var randomPeer = {
	'broadhash': '198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
	'dappid': null,
	'height': 1,
	'ip': '40.40.40.40',
	'os': 'unknown',
	'port': 4000,
	'state': 2,
	'version': '0.1.2'
};

describe('peers', function () {

	var peers;

	before(function (done) {
		modulesLoader.initWithDb(Peers, function (err, peersModule) {
			if (err) {
				return done(err);
			}
			peers = peersModule;
			done();
		});
	});

	describe('update', function () {

		before(function (done) {
			sinon.stub(PeerSweeper.prototype, 'push').returns(true);
			done();
		});

		it('should call PeerSweeper push with proper parameters', function (done) {
			node.expect(peers.update(randomPeer)).to.be.ok;
			sinon.assert.calledWith(PeerSweeper.prototype.push, 'upsert', new Peer(randomPeer).object());
			done();
		});
	});

	after(function (done) {
		modulesLoader.getDbConnection(function (err, db) {
			if (err) {
				return done(err);
			}
			clearDatabaseTable(db, modulesLoader.logger, 'peers', done);
		});
	});
});
