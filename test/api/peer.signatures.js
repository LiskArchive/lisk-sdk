'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');

describe('GET /peer/signatures', function () {

  it('using incorrect nethash in headers should fail', function (done) {
    node.get('/peer/signatures')
      .set('nethash', 'incorrect')
      .end(function (err, res) {
        node.debug('> Response:'.grey, JSON.stringify(res.body));
        node.expect(res.body).to.have.property('success').to.be.not.ok;
        node.expect(res.body.expected).to.equal(node.config.nethash);
        done();
      });
  });

  it('using valid headers should be ok', function (done) {
    node.get('/peer/signatures')
      .end(function (err, res) {
        node.debug('> Response:'.grey, JSON.stringify(res.body));
        node.expect(res.body).to.have.property('success').to.be.ok;
        node.expect(res.body).to.have.property('signatures').that.is.an('array');
        done();
      });
  });
});

describe('POST /peer/signatures', function () {

  var validParams;

  var transaction = node.lisk.transaction.createTransaction('1L', 1, node.gAccount.password);

  beforeEach(function (done) {
    validParams = {
      signature: {
        signature: transaction.signature,
        transaction: transaction.id
      }
    };
    done();
  });

  it('using incorrect nethash in headers should fail', function (done) {
    node.post('/peer/signatures')
      .set('nethash', 'incorrect')
      .end(function (err, res) {
        node.debug('> Response:'.grey, JSON.stringify(res.body));
        node.expect(res.body).to.have.property('success').to.be.not.ok;
        node.expect(res.body.expected).to.equal(node.config.nethash);
        done();
      });
  });

  it('using invalid signature schema should fail', function (done) {
    delete validParams.signature.transaction;

    node.post('/peer/signatures', validParams)
      .end(function (err, res) {
        node.debug('> Response:'.grey, JSON.stringify(res.body));
        node.expect(res.body).to.have.property('success').to.be.not.ok;
        node.expect(res.body).to.have.property('error').to.equal('Signature validation failed');
        done();
      });
  });

  it('using unprocessable signature should fail', function (done) {
    validParams.signature.transaction = 'invalidId';

    node.post('/peer/signatures', validParams)
      .end(function (err, res) {
        node.debug('> Response:'.grey, JSON.stringify(res.body));
        node.expect(res.body).to.have.property('success').to.be.not.ok;
        node.expect(res.body).to.have.property('error').to.equal('Error processing signature');
        done();
      });
  });

  it('using processable signature should be ok');
});
