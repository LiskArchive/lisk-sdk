'use strict';

var chai = require('chai');
var express = require('express');
var sinon = require('sinon');
var node = require('../../node.js');

var modulesLoader = require('../../common/initModule').modulesLoader;
var Blocks = require('../../../modules/blocks');

describe('blocks', function () {

	var blocks;

	before(function (done) {
		modulesLoader.initModuleWithDb(Blocks, function (err, __blocks) {
			if (err) {
				return done(err);
			}
			blocks = __blocks;
			done();
		});
	});

	describe('getBlockProgressLogger', function () {

		it('should logs correctly', function () {
			var tracker = blocks.getBlockProgressLogger(5, 2, '');
			tracker.log = sinon.spy();
			node.expect(tracker.applied).to.equals(0);
			node.expect(tracker.step).to.equals(2);
			tracker.applyNext();
			node.expect(tracker.log.calledOnce).to.ok;
			node.expect(tracker.applied).to.equals(1);
			tracker.applyNext();
			node.expect(tracker.log.calledTwice).to.not.ok;
			node.expect(tracker.applied).to.equals(2);
			tracker.applyNext();
			node.expect(tracker.log.calledTwice).to.ok;
			node.expect(tracker.applied).to.equals(3);
			tracker.applyNext();
			node.expect(tracker.log.calledThrice).to.not.ok;
			node.expect(tracker.applied).to.equals(4);
			tracker.applyNext();
			node.expect(tracker.log.calledThrice).to.ok;
			node.expect(tracker.applied).to.equals(5);

			node.expect(tracker.applyNext.bind(tracker)).to.throw('Cannot apply transaction over the limit: 5');
		});
	});
});
