'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');

var Rules = require('../../../../../api/ws/workers/rules');

describe('Rules', function () {
	var rules;
	var allowMock = sinon.spy();
	var blockMock = sinon.spy();
	var panicMock = sinon.spy();

	before(function () {
		rules = new Rules(allowMock, blockMock, panicMock);
		allowMock.reset();
		blockMock.reset();
		panicMock.reset();
	});

	describe('constructor', function () {
		it('should construct set of rules', function () {
			expect(rules).to.have.property('rules').not.to.be.empty;
		});
	});

	describe('rules', function () {
		it('should have entries for every configuration', function () {
			expect(rules.rules).to.have.nested.property('0.true.true.true').to.be.a('function');
			expect(rules.rules).to.have.nested.property('0.true.true.false').to.be.a('function');
			expect(rules.rules).to.have.nested.property('0.true.false.true').to.be.a('function');
			expect(rules.rules).to.have.nested.property('0.true.false.false').to.be.a('function');
			expect(rules.rules).to.have.nested.property('0.false.true.true').to.be.a('function');
			expect(rules.rules).to.have.nested.property('0.false.true.false').to.be.a('function');
			expect(rules.rules).to.have.nested.property('0.false.false.true').to.be.a('function');
			expect(rules.rules).to.have.nested.property('0.false.false.false').to.be.a('function');

			expect(rules.rules).to.have.nested.property('1.true.true.true').to.be.a('function');
			expect(rules.rules).to.have.nested.property('1.true.true.false').to.be.a('function');
			expect(rules.rules).to.have.nested.property('1.true.false.true').to.be.a('function');
			expect(rules.rules).to.have.nested.property('1.true.false.false').to.be.a('function');
			expect(rules.rules).to.have.nested.property('1.false.true.true').to.be.a('function');
			expect(rules.rules).to.have.nested.property('1.false.true.false').to.be.a('function');
			expect(rules.rules).to.have.nested.property('1.false.false.true').to.be.a('function');
			expect(rules.rules).to.have.nested.property('1.false.false.false').to.be.a('function');
		});

	});
});
