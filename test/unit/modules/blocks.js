'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var express = require('express');
var sinon = require('sinon');

var DBSandbox = require('../../common/globalBefore').DBSandbox;
var node = require('../../node');

describe('blocks', function () {
	
	describe('Blocks constructor', function () {
		
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
		
		it('should set this.shared = this.submodules.api');
		
		it('should set this.verify = this.submodules.verify');
		
		it('should set this.process = this.submodules.process');
		
		it('should set this.utils = this.submodules.utils');
		
		it('should set this.chain = this.submodules.chain');
		
		it('should set self = this');
		
		it('should call this.submodules.chain.saveGenesisBlock');
		
		it('should call callback with result = self');
		
		describe('when this.submodules.chain.saveGenesisBlock fails', function () {
			
			it('should call callback with error');
		});
		
		describe('when this.submodules.chain.saveGenesisBlock succeeds', function () {
			
			it('should call callback with error = undefined');
		});
		
		describe('callback for this.submodules.chain.saveGenesisBlock', function () {
			
			
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
		
		it('should set __private.loaded = true');
	});
	
	describe('cleanup', function () {
		
		it('should set __private.loaded = false');
		
		it('should set __private.cleanup = true');
		
		describe('when __private.isActive = false', function () {
			
			it('should call callback');
		});
		
		describe('when __private.isActive = true', function () {
			
			describe('after 10 seconds', function () {
				
				it('should call library.logger.info with "Waiting for block processing to finish..."');
			});
			
			describe('after 100 seconds', function () {
				
				it('should call library.logger.info with "Waiting for block processing to finish..." 10 times');
			});
		});
	});
	
	describe('isLoaded', function () {
		
		it('should return __private.loaded');
	});
	
	//============ old code begins ============================

	var blocks;
	var dbSandbox;

	before(function (done) {
		dbSandbox = new DBSandbox(node.config.db, 'lisk_test_modules_blocks');
		dbSandbox.create(function (err, __db) {
			node.initApplication(function (err, scope) {
				blocks = scope.modules.blocks;
				done();
			}, {db: __db});
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
