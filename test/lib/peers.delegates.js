var node = require('./../variables.js'),
  crypto = require('crypto');

var account = node.randomAccount();
var account2 = node.randomAccount();

describe("Peers delegates transactions", function () {
  it("Create delegate with incorrect username. Should return not ok", function (done) {
    node.api.post('/accounts/open')
      .set('Accept', 'application/json')
      .set('version',node.version)
      .set('share-port',1)
      .set('port',node.config.port)
      .send({
        secret: account.password
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        account.address = res.body.account.address;
        node.api.put('/transactions')
          .set('Accept', 'application/json')
          .set('version',node.version)
          .set('share-port',1)
          .set('port',node.config.port)
          .send({
            secret: node.peers_config.account,
            amount: node.Fees.delegateRegistrationFee,
            recipientId: account.address
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            node.onNewBlock(function (err) {
              node.expect(err).to.be.not.ok;
              var transaction = node.lisk.delegate.createDelegate(account.password, crypto.randomBytes(64).toString('hex'));
              transaction.fee = node.Fees.delegateRegistrationFee;

              node.peer.post('/transactions')
                .set('Accept', 'application/json')
                .set('version',node.version)
                .set('share-port',1)
                .set('port',node.config.port)
                .send({
                  transaction: transaction
                })
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                  console.log(JSON.stringify(res.body));
                  node.expect(res.body).to.have.property("success").to.be.false;
                  done();
                });
            });
          });
      });
  });

  it("Create delegate from account with no funds. Should return not ok", function (done) {
    var transaction = node.lisk.delegate.createDelegate(node.randomPassword(), node.randomDelegateName());
    transaction.fee = node.Fees.delegateRegistrationFee;

    node.peer.post('/transactions')
      .set('Accept', 'application/json')
      .set('version',node.version)
      .set('share-port',1)
      .set('port',node.config.port)
      .send({
        transaction: transaction
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        console.log(JSON.stringify(res.body));
        node.expect(res.body).to.have.property("success").to.be.false;
        done();
      });
  });

  it("Create delegate on acccount. Should return ok", function (done) {
    account.username = node.randomDelegateName();
    var transaction = node.lisk.delegate.createDelegate(account.password, account.username);
    transaction.fee = node.Fees.delegateRegistrationFee;

    node.peer.post('/transactions')
      .set('Accept', 'application/json')
      .set('version',node.version)
      .set('share-port',1)
      .set('port',node.config.port)
      .send({
        transaction: transaction
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        console.log(JSON.stringify(res.body));
        node.expect(res.body).to.have.property("success").to.be.true;
        done();
      });
  });

  it("Create delegate on new account and then create it again in one block", function (done) {
    node.api.post('/accounts/open')
      .set('Accept', 'application/json')
      .set('version',node.version)
      .set('share-port',1)
      .set('port',node.config.port)
      .send({
        secret: account2.password
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        account2.address = res.body.account.address;
        node.api.put('/transactions')
          .set('Accept', 'application/json')
          .set('version',node.version)
          .set('share-port',1)
          .set('port',node.config.port)
          .send({
            secret: node.peers_config.account,
            amount: node.Fees.delegateRegistrationFee,
            recipientId: account2.address
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            node.onNewBlock(function (err) {
              node.expect(err).to.be.not.ok;
              account2.username = node.randomDelegateName();
              var transaction = node.lisk.delegate.createDelegate(account2.password, account2.username);
              transaction.fee = node.Fees.delegateRegistrationFee;

              node.peer.post('/transactions')
                .set('Accept', 'application/json')
                .set('version',node.version)
                .set('share-port',1)
                .set('port',node.config.port)
                .send({
                  transaction: transaction
                })
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                  node.expect(res.body).to.have.property("success").to.be.true;

                  account2.username = node.randomDelegateName();
                  var transaction2 = node.lisk.delegate.createDelegate(account2.password, account2.username);
                  transaction2.fee = node.Fees.delegateRegistrationFee;

                  node.peer.post('/transactions')
                    .set('Accept', 'application/json')
                    .set('version',node.version)
                    .set('share-port',1)
                    .set('port',node.config.port)
                    .send({
                      transaction: transaction2
                    })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                      console.log(JSON.stringify(res.body));
                      node.expect(res.body).to.have.property("success").to.be.false;
                      done();
                    });
                });
            });
          });
      });
  });
});
