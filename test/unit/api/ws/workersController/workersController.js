'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var express = require('express');
var sinon = require('sinon');

var workersController = require('../../../../../api/ws/workersController');

describe('workersController', function () {

	describe('constructor', function () {

		it('should initialize empty registeredReceivers property', function () {
			expect(workersController).to.have.property('registeredReceivers').and.to.be.empty;
		});

		it('should initialize empty unemployedWorkers property', function () {
			expect(workersController).to.have.property('unemployedWorkers').and.to.be.empty;
		});
	});
});
