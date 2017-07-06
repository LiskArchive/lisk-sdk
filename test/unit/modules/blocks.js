'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var express = require('express');
var sinon = require('sinon');

var modulesLoader = require('../../common/initModule').modulesLoader;

describe('blocks', function () {

	var blocks;

	before(function (done) {
		modulesLoader.initModules([
			{blocks: require('../../../modules/blocks')}
		], [
			{'transaction': require('../../../logic/transaction')},
			{'block': require('../../../logic/block')},
			{'peers': require('../../../logic/peers.js')}
		], {}, function (err, __blocks) {
			if (err) {
				return done(err);
			}
			blocks = __blocks.blocks;
			done();
		});
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
