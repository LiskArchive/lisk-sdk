'use strict'; /*jslint mocha:true, expr:true */

var chai = require('chai');
var express = require('express');
var sinon = require('sinon');
var node = require('../../node.js');
var randomPeer = require('../../common/objectStubs').randomPeer;

var clearDatabaseTable = require('../../common/globalBefore').clearDatabaseTable;
var modulesLoader = require('../../common/initModule').modulesLoader;
var Loader = require('../../../modules/loader');


describe('loader', function () {

	var loader;
	var modules;

	before(function (done) {
		modulesLoader.initAllModules(function (err, __modules) {
			loader = __modules.loader;
			modules = __modules;
			modules.transport.getFromPeer = sinon.stub().callsArgWith(2, null, {
				success: true,
				peer: randomPeer,
				body: {
					success: true, height: randomPeer.height, peers: [randomPeer]
				}
			});
			modules.transport.getFromRandomPeer = sinon.stub().callsArgWith(1, null, {
				success: true,
				peer: randomPeer,
				body: {
					success: true, height: randomPeer.height, peers: [randomPeer]
				}
			});
			loader.onBind(modules);
			done();
		});

	});

	it('should call getFromRandomPeer when no sync peers defined', function (done) {
		loader.getNetwork(function (err, res) {
			node.expect(modules.transport.getFromRandomPeer.calledOnce).to.be.ok;
			done();
		});
	});

	it('should call not getFromRandomPeer when sync peers defined', function (done) {
		var config = require('../../config.json');
		config.syncPeers = {
			list: [{
				ip: randomPeer.ip,
				port: randomPeer.port
			}]
		};
		modules.transport.getFromRandomPeer.reset();
		modules.transport.getFromPeer.reset();
		node.expect(modules.transport.getFromRandomPeer.notCalled).to.be.ok;
		modulesLoader.initModuleWithDb(Loader, function (err, __loader) {
			loader = __loader;
			loader.onBind(modules);
			loader.getNetwork(function (err, res) {
				node.expect(modules.transport.getFromRandomPeer.notCalled).to.be.ok;
				node.expect(modules.transport.getFromPeer.called).to.be.ok;
				done();
			});

		}, {config: config});

	});


});
