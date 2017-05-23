'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var express = require('express');
var sinon = require('sinon');

var modulesLoader = require('../../common/initModule').modulesLoader;
var Loader = require('../../../modules/loader');

describe('loader', function () {

	var loader, modules;

	before(function (done) {
		modulesLoader.initAllModules(function (err, __modules) {
			if (err) {
				return done(err);
			}
			loader = __modules.loader;
			modules = __modules;
			loader.onBind(modules);
			done();
		}, {});
	});

	describe('findGoodPeers', function () {

		before(function () {
			modules.blocks.lastBlock = {
				get: function () {
					return {
						height: 2
					};
				}
			};
		});

		it('should return peers list sorted by height', function () {

			var peers = [
				{
					ip: '1.1.1.1',
					port: '4000',
					height: 1
				},
				{
					ip: '4.4.4.4',
					port: '4000',
					height: 4
				},
				{
					ip: '3.3.3.3',
					port: '4000',
					height: 3
				},
				{
					ip: '2.2.2.2',
					port: '4000',
					height: 2
				}
			];

			var goodPeers = loader.findGoodPeers(peers);
			expect(goodPeers).to.have.property('height').equal(4);
			expect(goodPeers).to.have.property('peers').to.be.an('array').to.have.lengthOf(2);
			expect(goodPeers.peers).equal(			{
				ip: '4.4.4.4',
				port: '4000',
				height: 4
			});
		});
	});
});
