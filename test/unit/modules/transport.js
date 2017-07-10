'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');
var modulesLoader = require('../../common/initModule').modulesLoader;
var _ = require('lodash');

var crypto = require('crypto');

var constants = require('../../../helpers/constants');
var ed = require('../../../helpers/ed');
var randomPeer = require('../../common/objectStubs').randomPeer;
var Peer = require('../../../logic/peer');

var validPeer = new Peer(randomPeer);

describe('transport', function () {

	var transport, modules, NONCE, keys;

	before(function (done) {
		modulesLoader.initAllModules(function (err, __modules) {
			if (err) {
				return done(err);
			}
			transport = __modules.transport;
			modules = __modules;
			NONCE = __modules.system.getNonce();
			transport.onBind(modules);
			__modules.peers.onBind(modules);

			sinon.stub(modules.peers, 'update', function () {
				return true;
			});

			done();
		}, {});
	});

	before(function () {

		var randomString = 'ABCDE';
		var hash = crypto.createHash('sha256').update(randomString, 'utf8').digest();
		keys = ed.makeKeypair(hash);

		constants.setConst('connectionPrivateKey', keys.privateKey);

		constants.setConst('headers', {
			nonce: keys.publicKey.toString('hex')
		});
	});

	function removeAll (done) {
		modules.peers.list({}, function (err, __peers) {
			__peers.forEach(function (peer) {
				modules.peers.remove(peer);
			});
			done();
		});
	}

	function insertValidPeerSignedWithOwnerKey (peer, cb) {

		if (modules.peers.update.restore) {
			modules.peers.update.restore();
		}

		var ownersPrivateKey = constants.getConst('connectionPrivateKey');
		var validPeerValidSignature = ed.sign(Buffer.from(JSON.stringify(peer.object())), ownersPrivateKey);

		transport.internal.insertPeer({peer: peer.object(), signature: validPeerValidSignature.toString('hex')}, function (err, result) {
			expect(err).to.be.null;

			sinon.stub(modules.peers, 'update', function () {
				return true;
			});

			modules.peers.list({}, function (err, __peers) {
				expect(__peers.find(function (__peer) {
					return __peer.string === peer.ip + ':' + peer.port;
				})).not.to.be.empty;

				cb();
			});
		});
	}

	describe('insertPeer', function () {

		beforeEach(function () {
			if (_.isFunction(_.get(modules, 'peers.update.restore', false))) {
				modules.peers.update.reset();
			}
		});

		it('should not call peers.update without parameters', function (done) {
			transport.internal.insertPeer(null, function (err) {
				expect(err).equal('Expected type object but found type null');
				expect(modules.peers.update.called).not.to.be.ok;
				done();
			});
		});

		it('should not call peers.update without peer', function (done) {
			transport.internal.insertPeer({signature: 'signature'}, function (err) {
				expect(err).equal('Missing required property: peer');
				expect(modules.peers.update.called).not.to.be.ok;
				done();
			});

		});

		it('should not call peers.update without signature', function (done) {
			transport.internal.insertPeer({peer: 'peer'}, function (err) {
				expect(err).equal('Missing required property: signature');
				expect(modules.peers.update.called).not.to.be.ok;
				done();
			});
		});


		it('should accept new peer only when peer\'s data is signed with own private key', function (done) {
			var ownersPrivateKey = constants.getConst('connectionPrivateKey');
			var validPeerValidSignature = ed.sign(Buffer.from(JSON.stringify(validPeer.object())), ownersPrivateKey);

			transport.internal.insertPeer({peer: validPeer.object(), signature: validPeerValidSignature.toString('hex')}, function (err, result) {
				expect(modules.peers.update.calledOnce).to.be.ok;
				expect(modules.peers.update.calledWith(validPeer.object())).to.be.ok;
				expect(err).to.be.null;
				done();
			});
		});

		it('should not accept new peer when peer\'s data is signed with different than owner\'s private key', function (done) {

			var differentString = 'EDCBA';
			var hash = crypto.createHash('sha256').update(differentString, 'utf8').digest();
			var differentPrivateKey = ed.makeKeypair(hash).privateKey;
			var validPeerDifferentSignature = ed.sign(Buffer.from(JSON.stringify(validPeer.object())), differentPrivateKey);

			transport.internal.insertPeer({peer: validPeer.object(), signature: validPeerDifferentSignature.toString('hex')}, function (err, result) {
				expect(err).equal('Unsuccessful validation of update peer signature');
				expect(modules.peers.update.calledOnce).not.to.be.ok;
				done();
			});
		});

		it('should not accept new peer when peer\'s data is malformed but signed with owner\'s private key', function (done) {

			var ownersPrivateKey = constants.getConst('connectionPrivateKey');
			var validPeerValidSignature = ed.sign(Buffer.from(JSON.stringify(validPeer.object())), ownersPrivateKey);

			var malformedPeer = new Peer(_.clone(randomPeer));
			malformedPeer.height -= 1;
			transport.internal.insertPeer({peer: malformedPeer.object(), signature: validPeerValidSignature.toString('hex')}, function (err, result) {
				expect(err).equal('Unsuccessful validation of update peer signature');
				expect(modules.peers.update.calledOnce).not.to.be.ok;
				done();
			});
		});

		after(function () {
			modules.peers.update.restore();
		});
	});


	describe('acceptPeer', function () {

		beforeEach(function () {
			if (_.isFunction(_.get(modules, 'peers.update.restore', false))) {
				modules.peers.update.reset();
			}
		});

		it('should not call peers.update without parameters', function (done) {
			transport.internal.acceptPeer(null, function (err) {
				expect(err).equal('Expected type object but found type null');
				expect(modules.peers.update.called).not.to.be.ok;
				done();
			});
		});

		it('should not call peers.update without peer', function (done) {
			transport.internal.acceptPeer({signature: 'signature'}, function (err) {
				expect(err).equal('Missing required property: peer');
				expect(modules.peers.update.called).not.to.be.ok;
				done();
			});

		});

		it('should not call peers.update without signature', function (done) {
			transport.internal.acceptPeer({peer: 'peer'}, function (err) {
				expect(err).equal('Missing required property: signature');
				expect(modules.peers.update.called).not.to.be.ok;
				done();
			});
		});

		describe('attempt to insert peer', function () {

			it('should not accept new peer when peer\'s data is signed with own private key', function (done) {
				var ownersPrivateKey = constants.getConst('connectionPrivateKey');
				var validPeerValidSignature = ed.sign(Buffer.from(JSON.stringify(validPeer.object())), ownersPrivateKey);

				transport.internal.acceptPeer({peer: validPeer.object(), signature: validPeerValidSignature.toString('hex')}, function (err, result) {
					expect(err).equal('Peer is not on the peers list. Cannot update.');
					expect(modules.peers.update.calledOnce).not.to.be.ok;
					done();
				});
			});

			it('should not accept new peer when peer\'s data is signed with different than owner\'s private key', function (done) {

				var differentString = 'EDCBA';
				var hash = crypto.createHash('sha256').update(differentString, 'utf8').digest();
				var differentPrivateKey = ed.makeKeypair(hash).privateKey;
				var validPeerDifferentSignature = ed.sign(Buffer.from(JSON.stringify(validPeer.object())), differentPrivateKey);

				transport.internal.acceptPeer({peer: validPeer.object(), signature: validPeerDifferentSignature.toString('hex')}, function (err, result) {
					expect(err).equal('Peer is not on the peers list. Cannot update.');
					expect(modules.peers.update.calledOnce).not.to.be.ok;
					done();
				});
			});

			it('should not accept new peer when peer\'s data is malformed but signed with owner\'s private key', function (done) {

				var ownersPrivateKey = constants.getConst('connectionPrivateKey');
				var validPeerValidSignature = ed.sign(Buffer.from(JSON.stringify(validPeer.object())), ownersPrivateKey);

				var malformedPeer = new Peer(_.clone(randomPeer));
				malformedPeer.height -= 1;
				transport.internal.acceptPeer({peer: malformedPeer.object(), signature: validPeerValidSignature.toString('hex')}, function (err, result) {
					expect(err).equal('Peer is not on the peers list. Cannot update.');
					expect(modules.peers.update.calledOnce).not.to.be.ok;
					done();
				});
			});

		});

		describe('update peer', function () {

			var otherPeerAKeys, otherPeerBKeys;

			before(function () {

				var randomString = 'OTHER_RANDOM_STRING';
				var hash = crypto.createHash('sha256').update(randomString, 'utf8').digest();
				otherPeerAKeys = ed.makeKeypair(hash);

				validPeer.nonce = otherPeerAKeys.publicKey.toString('hex');

				var nextDifferentString = 'NEXT_DIFFERENT_STRING';
				hash = crypto.createHash('sha256').update(nextDifferentString, 'utf8').digest();
				otherPeerBKeys = ed.makeKeypair(hash);
			});

			beforeEach(function (done) {
				removeAll(done);
			});

			it('should not update valid peer\'s signed by peer\'s private key if it is not on a peers list', function (done) {

				var validPeerValidSignature = ed.sign(Buffer.from(JSON.stringify(validPeer.object())), otherPeerAKeys.privateKey);

				transport.internal.acceptPeer({peer: validPeer.object(), signature: validPeerValidSignature.toString('hex')}, function (err, result) {
					expect(err).equal('Peer is not on the peers list. Cannot update.');
					expect(modules.peers.update.calledOnce).not.to.be.ok;
					done();
				});
			});

			it('should update valid peer\'s signed by peer\'s private key if it is on a peers list', function (done) {

				insertValidPeerSignedWithOwnerKey(validPeer, function () {
					var validPeerValidSignature = ed.sign(Buffer.from(JSON.stringify(validPeer.object())), otherPeerAKeys.privateKey);

					transport.internal.acceptPeer({peer: validPeer.object(), signature: validPeerValidSignature.toString('hex')}, function (err, result) {
						expect(err).to.be.null;
						expect(modules.peers.update.calledOnce).to.be.ok;
						expect(modules.peers.update.calledWith(validPeer.object())).to.be.ok;
						done();
					});
				});
			});

			it('should update valid peer\'s signed by peer\'s private key if it is on a peers list without address', function (done) {

				insertValidPeerSignedWithOwnerKey(validPeer, function () {

					var withoutAddressPeer = _.clone(validPeer);
					delete withoutAddressPeer.ip;
					delete withoutAddressPeer.port;

					var validPeerValidSignature = ed.sign(Buffer.from(JSON.stringify(withoutAddressPeer.object())), otherPeerAKeys.privateKey);

					transport.internal.acceptPeer({peer: withoutAddressPeer.object(), signature: validPeerValidSignature.toString('hex')}, function (err, result) {
						expect(err).to.be.null;
						expect(modules.peers.update.calledOnce).to.be.ok;
						expect(modules.peers.update.calledWith(withoutAddressPeer.object())).to.be.ok;
						done();
					});
				});
			});

			it('should update valid peer\'s signed by peer\'s private key read from string if it is on a peers list', function (done) {

				insertValidPeerSignedWithOwnerKey(validPeer, function () {

					var otherPeerAPrivateKeyString = otherPeerAKeys.privateKey.toString('hex');
					var validPeerValidSignature = ed.sign(Buffer.from(JSON.stringify(validPeer.object())), Buffer.from(otherPeerAPrivateKeyString, 'hex'));
					var signatureString = validPeerValidSignature.toString('hex');

					transport.internal.acceptPeer({peer: validPeer.object(), signature: signatureString}, function (err, result) {
						expect(err).to.be.null;
						expect(modules.peers.update.calledOnce).to.be.ok;
						expect(modules.peers.update.calledWith(validPeer.object())).to.be.ok;
						done();
					});
				});
			});

			it('should not update different peer\'s data which is not on a list signed by peer\'s private key if peer is on a peers list', function (done) {

				var nextDifferentPeer = _.clone(randomPeer);
				nextDifferentPeer.ip = '30.30.30.30';
				nextDifferentPeer.port = '3333';
				nextDifferentPeer.nonce = otherPeerBKeys.publicKey.toString('hex');
				nextDifferentPeer = new Peer(nextDifferentPeer);

				insertValidPeerSignedWithOwnerKey(validPeer, function () {

					var nextDifferentPeerSignature = ed.sign(Buffer.from(JSON.stringify(nextDifferentPeer.object())), otherPeerAKeys.privateKey);

					transport.internal.acceptPeer({peer: nextDifferentPeer.object(), signature: nextDifferentPeerSignature.toString('hex')}, function (err, result) {
						expect(err).equal('Peer is not on the peers list. Cannot update.');
						expect(modules.peers.update.calledOnce).not.to.be.ok;
						done();
					});
				});
			});

			it('should not update different peer\'s data which is on a list signed by peer\'s private key if peer is on a peers list', function (done) {

				var nextDifferentPeer = _.clone(randomPeer);
				nextDifferentPeer.ip = '30.30.30.30';
				nextDifferentPeer.port = '3333';
				nextDifferentPeer.nonce = otherPeerBKeys.publicKey.toString('hex');
				nextDifferentPeer = new Peer(nextDifferentPeer);

				insertValidPeerSignedWithOwnerKey(validPeer, function () {
					insertValidPeerSignedWithOwnerKey(nextDifferentPeer, function () {
						var nextDifferentPeerSignature = ed.sign(Buffer.from(JSON.stringify(nextDifferentPeer.object())), otherPeerAKeys.privateKey);
						transport.internal.acceptPeer({peer: nextDifferentPeer.object(), signature: nextDifferentPeerSignature.toString('hex')}, function (err, result) {
							expect(err).equal('Unsuccessful validation of update peer signature');
							expect(modules.peers.update.calledOnce).not.to.be.ok;
							done();
						});
					});
				});

			});
		});

		after(function () {
			modules.peers.update.restore();
		});
	});

	describe('removePeer', function () {

		var otherPeerAKeys, otherPeerBKeys;

		before(function () {

			var randomString = 'OTHER_RANDOM_STRING';
			var hash = crypto.createHash('sha256').update(randomString, 'utf8').digest();
			otherPeerAKeys = ed.makeKeypair(hash);

			validPeer.nonce = otherPeerAKeys.publicKey.toString('hex');

			var nextDifferentString = 'NEXT_DIFFERENT_STRING';
			hash = crypto.createHash('sha256').update(nextDifferentString, 'utf8').digest();
			otherPeerBKeys = ed.makeKeypair(hash);
		});

		beforeEach(function (done) {

			if (modules.peers.remove.restore) {
				modules.peers.remove.restore();
			}

			removeAll(function () {
				sinon.stub(modules.peers, 'remove', function () {
					return true;
				});
				done();
			});

		});

		before(function () {
			sinon.stub(modules.peers, 'remove', function () {
				return true;
			});
		});

		beforeEach(function () {
			if (_.isFunction(_.get(modules, 'peers.remove.restore', false))) {
				modules.peers.remove.reset();
			}
		});

		it('should not call peers.remove without parameters', function (done) {
			transport.internal.removePeer(null, function (err) {
				expect(err).equal('Expected type object but found type null');
				expect(modules.peers.remove.called).not.to.be.ok;
				done();
			});
		});

		it('should not call peers.remove without peer', function (done) {
			transport.internal.removePeer({signature: 'signature'}, function (err) {
				expect(err).equal('Missing required property: peer');
				expect(modules.peers.remove.called).not.to.be.ok;
				done();
			});

		});

		it('should not call peers.remove without signature', function (done) {
			transport.internal.removePeer({peer: 'peer'}, function (err) {
				expect(err).equal('Missing required property: signature');
				expect(modules.peers.remove.called).not.to.be.ok;
				done();
			});
		});

		describe('removing by itself', function () {

			it('should remove peer only when peer\'s data is signed with own private key', function (done) {
				var ownersPrivateKey = constants.getConst('connectionPrivateKey');
				var validPeerValidSignature = ed.sign(Buffer.from(JSON.stringify(validPeer.object())), ownersPrivateKey);

				transport.internal.removePeer({peer: validPeer.object(), signature: validPeerValidSignature.toString('hex')}, function (err, result) {
					expect(modules.peers.remove.calledOnce).to.be.ok;
					expect(modules.peers.remove.calledWith(validPeer.object())).to.be.ok;
					expect(err).to.be.null;
					done();
				});
			});

			it('should not remove peer when peer\'s data is signed with different than owner\'s private key', function (done) {

				var differentString = 'EDCBA';
				var hash = crypto.createHash('sha256').update(differentString, 'utf8').digest();
				var differentPrivateKey = ed.makeKeypair(hash).privateKey;
				var validPeerDifferentSignature = ed.sign(Buffer.from(JSON.stringify(validPeer.object())), differentPrivateKey);

				transport.internal.removePeer({peer: validPeer.object(), signature: validPeerDifferentSignature.toString('hex')}, function (err, result) {
					expect(err).equal('Unsuccessful validation of update peer signature');
					expect(modules.peers.remove.calledOnce).not.to.be.ok;
					done();
				});
			});

			it('should not remove peer when peer\'s data is malformed but signed with owner\'s private key', function (done) {

				var ownersPrivateKey = constants.getConst('connectionPrivateKey');
				var validPeerValidSignature = ed.sign(Buffer.from(JSON.stringify(validPeer.object())), ownersPrivateKey);

				var malformedPeer = new Peer(_.clone(randomPeer));
				malformedPeer.height -= 1;
				transport.internal.removePeer({peer: malformedPeer.object(), signature: validPeerValidSignature.toString('hex')}, function (err, result) {
					expect(err).equal('Unsuccessful validation of update peer signature');
					expect(modules.peers.remove.calledOnce).not.to.be.ok;
					done();
				});
			});
		});
	});
});

