var node = require("./../variables.js"),
    crypto = require("crypto");

var account = node.randomAccount();
var account2 = node.randomAccount();

describe("Testing /peer/transactions API with delegates management", function () {
  it("Creating a delegate with an invalid username. Should not be ok", function (done) {
    node.api.post("/accounts/open")
      .set("Accept", "application/json")
      .set("version", node.version)
      .set("nethash", node.config.nethash)
      .set("port", node.config.port)
      .send({
        secret: account.password
      })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        account.address = res.body.account.address;
        node.api.put("/transactions")
          .set("Accept", "application/json")
          .set("version", node.version)
          .set("nethash", node.config.nethash)
          .set("port", node.config.port)
          .send({
            secret: node.Gaccount.password,
            amount: node.Fees.delegateRegistrationFee,
            recipientId: account.address
          })
          .expect("Content-Type", /json/)
          .expect(200)
          .end(function (err, res) {
            node.onNewBlock(function (err) {
              node.expect(err).to.be.not.ok;
              var transaction = node.lisk.delegate.createDelegate(account.password, crypto.randomBytes(64).toString("hex"));
              transaction.fee = node.Fees.delegateRegistrationFee;

              node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version",node.version)
                .set("nethash", node.config.nethash)
                .set("port", node.config.port)
                .send({
                  transaction: transaction
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                  //console.log(JSON.stringify(res.body));
                  node.expect(res.body).to.have.property("success").to.be.false;
                  done();
                });
            });
          });
      });
  });

  it("Creating a delegate from an account with no funds. Should not be ok", function (done) {
    var transaction = node.lisk.delegate.createDelegate(node.randomPassword(), node.randomDelegateName().toLowerCase());
    transaction.fee = node.Fees.delegateRegistrationFee;

    node.peer.post("/transactions")
      .set("Accept", "application/json")
      .set("version", node.version)
      .set("nethash", node.config.nethash)
      .set("port", node.config.port)
      .send({
        transaction: transaction
      })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        //console.log(JSON.stringify(res.body));
        node.expect(res.body).to.have.property("success").to.be.false;
        done();
      });
  });

  it("Creating a delegate from an account with funds. Username uppercase. Should be not ok", function (done) {
    account.username = node.randomDelegateName().toUpperCase();
    var transaction = node.lisk.delegate.createDelegate(account.password, account.username);

    node.peer.post("/transactions")
      .set("Accept", "application/json")
      .set("version", node.version)
      .set("nethash", node.config.nethash)
      .set("port", node.config.port)
      .send({
        transaction: transaction
      })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        console.log(JSON.stringify(res.body));
        node.expect(res.body).to.have.property("success").to.be.false;
        done();
      });
  });

  it("Creating a delegate from an account with funds. Username is lowercase. Should be ok", function (done) {
    account.username = node.randomDelegateName().toLowerCase();
    var transaction = node.lisk.delegate.createDelegate(account.password, account.username);

    node.peer.post("/transactions")
      .set("Accept", "application/json")
      .set("version", node.version)
      .set("nethash", node.config.nethash)
      .set("port", node.config.port)
      .send({
        transaction: transaction
      })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        //console.log(JSON.stringify(res.body));
        node.expect(res.body).to.have.property("success").to.be.true;
        done();
      });
  });

  it("Creating a delegate twice within the same block. Should not be ok", function (done) {
    node.api.post("/accounts/open")
      .set("Accept", "application/json")
      .set("version", node.version)
      .set("nethash", node.config.nethash)
      .set("port", node.config.port)
      .send({
        secret: account2.password
      })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        account2.address = res.body.account.address;
        //console.log(account2);
        node.api.put("/transactions")
          .set("Accept", "application/json")
          .set("version", node.version)
          .set("nethash", node.config.nethash)
          .set("port", node.config.port)
          .send({
            secret: node.Gaccount.password,
            amount: node.Fees.delegateRegistrationFee,
            recipientId: account2.address
          })
          .expect("Content-Type", /json/)
          .expect(200)
          .end(function (err, res) {
            //console.log(res.body);
            node.onNewBlock(function (err) {
              node.expect(err).to.be.not.ok;
              account2.username = node.randomDelegateName().toLowerCase();
              var transaction = node.lisk.delegate.createDelegate(account2.password, account2.username);
              //console.log(transaction);
              node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version", node.version)
                .set("nethash", node.config.nethash)
                .set("port", node.config.port)
                .send({
                  transaction: transaction
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                  //console.log(res.body);
                  node.expect(res.body).to.have.property("success").to.be.true;

                  account2.username = node.randomDelegateName().toLowerCase();
                  var transaction2 = node.lisk.delegate.createDelegate(account2.password, account2.username);

                  node.peer.post("/transactions")
                    .set("Accept", "application/json")
                    .set("version", node.version)
                    .set("nethash", node.config.nethash)
                    .set("port", node.config.port)
                    .send({
                      transaction: transaction2
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                      //console.log(JSON.stringify(res.body));
                      node.expect(res.body).to.have.property("success").to.be.false;
                      done();
                    });
                });
            });
          });
      });
  });

  it("Creating a delegate on next block from an account with funds. Username is uppercase, and lowercase is already registered. Should be not ok", function (done) {
    var transaction = node.lisk.delegate.createDelegate(account2.password, account.username.toUpperCase());

    node.peer.post("/transactions")
      .set("Accept", "application/json")
      .set("version", node.version)
      .set("nethash", node.config.nethash)
      .set("port", node.config.port)
      .send({
        transaction: transaction
      })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        console.log(JSON.stringify(res.body));
        node.expect(res.body).to.have.property("success").to.be.false;
        done();
      });
  });

});
