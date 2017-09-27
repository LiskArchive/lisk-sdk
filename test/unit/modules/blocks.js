'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var express = require('express');
var sinon = require('sinon');

var modulesLoader = require('../../common/initModule').modulesLoader;

describe('blocks', function () {
	
	describe('Blocks', function () {
		
		describe('library', function () {
			
			it('should assign logger');
		});
		
		describe('this.submodules', function () {
			
			it('should assign api');
			
			it('should assign verify');
			
			it('should assign process');
			
			it('should assign utils');
			
			it('should assign chain');
		});
		
		it('should set this.shared to api submodule');
		
		it('should set this.verify to verify submodule');
		
		it('should set this.process to process submodule');
		
		it('should set this.utils to utils submodule');
		
		it('should set this.chain to chain submodule');
		
		it('should set self to this');
		
		it('should call this.submodules.chain.saveGenesisBlock');
		
		describe('callback for this.submodules.chain.saveGenesisBlock', function () {
			
			it('should call callback with error');
			
			it('should call callback with self');
		});
	});
	
	describe('lastBlock', function () {
		
		it('should assign get');
		
		it('should assign set');
		
		it('should assign isFresh');
	});
	
	describe('lastReciept', function () {
		
		it('should assign get');
		
		it('should assign update');
		
		it('should assign isStale');		
	});
	
	describe('isActive', function () {
		
		it('should assign get');
		
		it('should assign set');			
	});
	
	describe('isCleaning', function () {
		
		it('should assign get');			
	});
	
	describe('onBind', function () {
		
		it('should set __private.loaded to true');
	});
	
	describe('cleanup', function () {
		
		it('should set __private.loaded to false');
		
		it('should set __private.cleanup to true');
		
		describe('when __private.isActive is false', function () {
			
			it('should call callback');
		});
		
		describe('when __private.isActive is true', function () {
			
			it('should recheck if __private.isActive is false every 10 seconds');
			
			describe('when __private.isActive is false', function () {
			
				it('should call callback');
			});
		});
	});
	
	describe('isLoaded', function () {
		
		it('should return __private.loaded');
	});
	
	//============ old code begins ============================

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
