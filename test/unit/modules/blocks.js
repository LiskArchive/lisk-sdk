'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var express = require('express');
var sinon = require('sinon');

var modulesLoader = require('../../common/modulesLoader');
var DBSandbox = require('../../common/globalBefore').DBSandbox;
var node = require('../../node');

describe('blocks', function () {

	var blocks;
	var db;
	var dbSandbox;

	before(function (done) {
		dbSandbox = new DBSandbox(node.config.db, 'lisk_test_modules_blocks');
		dbSandbox.create(function (err, __db) {
			db = __db;
			node.initApplication(function (err, scope) {
				blocks = scope.modules.blocks;
				done();
			}, {db: db});
		});
	});

	after(function (done) {
		dbSandbox.destroy();
		node.appCleanup(done);
	});

	describe('getBlockProgressLogger', function () {

		it('should logs correctly', function () {
			var tracker = blocks.utils.getBlockProgressLogger(5, 2, '');
			tracker.log = sinon.spy();
			expect(tracker.applied).to.equals(0);
			expect(tracker.step).to.equals(2);
			tracker.applyNext();
			expect(tracker.log.calledOnce).to.ok;
			expect(tracker.applied).to.equals(1);
			tracker.applyNext();
			expect(tracker.log.calledTwice).to.not.ok;
			expect(tracker.applied).to.equals(2);
			tracker.applyNext();
			expect(tracker.log.calledTwice).to.ok;
			expect(tracker.applied).to.equals(3);
			tracker.applyNext();
			expect(tracker.log.calledThrice).to.not.ok;
			expect(tracker.applied).to.equals(4);
			tracker.applyNext();
			expect(tracker.log.calledThrice).to.ok;
			expect(tracker.applied).to.equals(5);

			expect(tracker.applyNext.bind(tracker)).to.throw('Cannot apply transaction over the limit: 5');
		});
	});
});
