'use strict'; /*jslint mocha:true, expr:true */

var chai = require('chai');
var express = require('express');
var _  = require('lodash');
var sinon = require('sinon');
var node = require('../../node.js');

var modulesLoader = require('../../common/initModule').modulesLoader;
var Peers = require('../../../modules/peers');

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

var currentPeers = [];

describe('peers', function () {

	var peers;

	function getPeers(cb) {
		peers.list({broadhash: node.config.nethash}, function (err, __peers) {
			node.expect(err).to.not.exist;
			node.expect(__peers).to.be.an('array');
			return cb(err, __peers);
		});
	}

	before(function (done) {
		modulesLoader.initModuleWithDb(Peers, function (err, peersModule) {
			if (err) {
				return done(err);
			}
			peers = peersModule;
			done();
		});
	});

	beforeEach(function (done) {
		getPeers(function (err, __peers) {
			currentPeers = __peers;
			done();
		});
	});

	describe('update', function () {

		it('it should insert new peer', function (done) {
			peers.update(randomPeer);

			getPeers(function (err, __peers) {
				node.expect(currentPeers.length + 1).that.equals(__peers.length);
				currentPeers = __peers;
				var inserted = __peers.find(function (p) {
					return p.ip + ':' + p.port === randomPeer.ip + ':' + randomPeer.port;
				});
				node.expect(inserted).to.be.an('object');
				node.expect(inserted).not.to.be.empty;
				done();
			});
		});

		it('it should update existing', function (done) {
			var toUpdate = _.clone(randomPeer);
			toUpdate.height += 1;
			peers.update(toUpdate);

			getPeers(function (err, __peers) {
				node.expect(currentPeers.length).that.equals(__peers.length);
				currentPeers = __peers;
				var updated = __peers.find(function (p) {
					return p.ip + ':' + p.port === randomPeer.ip + ':' + randomPeer.port;
				});
				node.expect(updated).to.be.an('object');
				node.expect(updated).not.to.be.empty;
				node.expect(updated.ip + ':' + updated.port).that.equals(randomPeer.ip + ':' + randomPeer.port);
				node.expect(updated.height).that.equals(toUpdate.height);
				done();
			});
		});

		it('it should insert new peer if ip or port changed', function (done) {
			var toUpdate = _.clone(randomPeer);
			toUpdate.port += 1;
			peers.update(toUpdate);

			getPeers(function (err, __peers) {
				node.expect(currentPeers.length + 1).that.equals(__peers.length);
				currentPeers = __peers;
				var inserted = __peers.find(function (p) {
					return p.ip + ':' + p.port === toUpdate.ip + ':' + toUpdate.port;
				});
				node.expect(inserted).to.be.an('object');
				node.expect(inserted).not.to.be.empty;
				node.expect(inserted.ip + ':' + inserted.port).that.equals(toUpdate.ip + ':' + toUpdate.port);

				toUpdate.ip = '40.40.40.41';
				peers.update(toUpdate);
				getPeers(function (err, __peers) {
					node.expect(currentPeers.length + 1).that.equals(__peers.length);
					currentPeers = __peers;
					var inserted = __peers.find(function (p) {
						return p.ip + ':' + p.port === toUpdate.ip + ':' + toUpdate.port;
					});
					node.expect(inserted).to.be.an('object');
					node.expect(inserted).not.to.be.empty;
					node.expect(inserted.ip + ':' + inserted.port).that.equals(toUpdate.ip + ':' + toUpdate.port);
					done();
				});
			});
		});

		var ipAndPortPeer = {
			ip: '40.41.40.41',
			port: 4000
		};

		it('it should insert new peer with only ip and port defined', function (done) {

			peers.update(ipAndPortPeer);

			getPeers(function (err, __peers) {
				node.expect(currentPeers.length + 1).that.equals(__peers.length);
				currentPeers = __peers;
				var inserted = __peers.find(function (p) {
					return p.ip + ':' + p.port === ipAndPortPeer.ip + ':' + ipAndPortPeer.port;
				});
				node.expect(inserted).to.be.an('object');
				node.expect(inserted).not.to.be.empty;
				node.expect(inserted.ip + ':' + inserted.port).that.equals(ipAndPortPeer.ip + ':' + ipAndPortPeer.port);
				done();
			});
		});

		it('it updates peer with only one field filled', function (done) {

			peers.update(ipAndPortPeer);

			getPeers(function (err, __peers) {
				currentPeers = __peers;

				var almostEmptyPeer = _.clone(ipAndPortPeer);
				almostEmptyPeer.height = 1;

				peers.update(almostEmptyPeer);
				getPeers(function (err, __peers) {
					node.expect(currentPeers.length).that.equals(__peers.length);
					var inserted = __peers.find(function (p) {
						return p.ip + ':' + p.port === ipAndPortPeer.ip + ':' + ipAndPortPeer.port;
					});
					node.expect(inserted).to.be.an('object');
					node.expect(inserted).not.to.be.empty;
					node.expect(inserted.ip + ':' + inserted.port).that.equals(ipAndPortPeer.ip + ':' + ipAndPortPeer.port);
					node.expect(inserted.height).that.equals(almostEmptyPeer.height);

					done();
				});
			});
		});


	});

	describe('ban', function () {

		var peerToBan;
		before(function (done) {
			peers.update(randomPeer);
			done();
		});

		it('should ban active peer', function (done) {
			getPeers(function (err, __peers) {
				currentPeers = __peers;
				peerToBan = currentPeers.find(function (p) {
					return p.ip + ':' + p.port === randomPeer.ip + ':' + randomPeer.port;
				});
				node.expect(peerToBan).to.be.an('object').and.not.to.be.empty;
				node.expect(peerToBan.state).that.equals(2);

				node.expect(peers.ban(peerToBan.ip, peerToBan.port, 1)).to.be.ok;
				getPeers(function (err, __peers) {
					node.expect(currentPeers.length - 1).that.equals(__peers.length);
					currentPeers = __peers;
					done();
				});
			});
		});
	});

	describe('remove', function () {

		before(function (done) {
			peers.update(randomPeer);
			done();
		});

		it('should remove added peer', function (done) {

			getPeers(function (err, __peers) {
				currentPeers = __peers;
				var peerToRemove = currentPeers.find(function (p) {
					return p.ip + ':' + p.port === randomPeer.ip + ':' + randomPeer.port;
				});
				node.expect(peerToRemove).to.be.an('object').and.not.to.be.empty;
				node.expect(peerToRemove.state).that.equals(2);

				node.expect(peers.remove(peerToRemove.ip, peerToRemove.port)).to.be.ok;
				getPeers(function (err, __peers) {
					node.expect(currentPeers.length - 1).that.equals(__peers.length);
					currentPeers = __peers;
					done();
				});
			});
		});
	});

	describe('acceptable', function () {

		var ip = require('ip');

		it('should accept peer with public ip', function () {
			node.expect(peers.acceptable([randomPeer])).that.is.an('array').and.to.deep.equal([randomPeer]);
		});

		it('should not accept peer with private ip', function () {
			var privatePeer = _.clone(randomPeer);
			privatePeer.ip = '127.0.0.1';
			node.expect(peers.acceptable([privatePeer])).that.is.an('array').and.to.be.empty;
		});

		it('should not accept peer with host\'s ip', function () {
			var meAsPeer = _.clone(randomPeer);
			meAsPeer.ip = ip.address('public', 'ipv4');
			node.expect(peers.acceptable([meAsPeer])).that.is.an('array').and.to.be.empty;
		});
	});

});
