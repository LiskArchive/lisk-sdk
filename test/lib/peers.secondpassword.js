var node = require("./../variables.js"),
  crypto = require("crypto");

var account = node.randomAccount();
var account2 = node.randomAccount();
var account3 = node.randomAccount();

describe("Testing /peer/transactions API with second signature management", function () {
  it("Send second signature from account that doesn't have it. Should return not ok", function (done) {
    var transaction = node.lisk.transaction.createTransaction("1L", 1, node.Gaccount.password, account.secondPassword);
    node.peer.post("/transactions")
      .set("Accept", "application/json")
      .set("version",node.version)
      .set("nethash", node.config.nethash)
      .set("port",node.config.port)
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

  it("Send second signature from account that have no funds. Should return not ok", function (done) {
    var transaction = node.lisk.signature.createSignature(node.randomPassword(), node.randomPassword());

    node.peer.post("/transactions")
      .set("Accept", "application/json")
      .set("version",node.version)
      .set("nethash", node.config.nethash)
      .set("port",node.config.port)
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

  it("Fund random account and enable second signature. Should return ok.", function (done) {
    node.api.post("/accounts/open")
      .set("Accept", "application/json")
      .set("version",node.version)
      .set("nethash", node.config.nethash)
      .set("port",node.config.port)
      .send({
        secret: account.password
      })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        account.address = res.body.account.address;
        node.api.put("/transactions")
          .set("Accept", "application/json")
          .set("version",node.version)
          .set("nethash", node.config.nethash)
          .set("port",node.config.port)
          .send({
            secret: node.Gaccount.password,
            amount: node.Fees.secondPasswordFee+100000000, //testing 1 delegate registration + 1 transaction sending 1Lisk
            recipientId: account.address
          })
          .expect("Content-Type", /json/)
          .expect(200)
          .end(function (err, res) {
            //console.log(JSON.stringify(res.body));
            node.expect(res.body).to.have.property("success").to.be.true;

            node.onNewBlock(function (err) {
              node.expect(err).to.be.not.ok;
              var transaction = node.lisk.signature.createSignature(account.password, account.secondPassword);
              transaction.fee = node.Fees.secondPasswordFee;

              node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version",node.version)
                .set("nethash", node.config.nethash)
                .set("port",node.config.port)
                .send({
                  transaction: transaction
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                  //console.log(transaction.recipientId);
                  //console.log(account.address);
                  node.expect(res.body).to.have.property("success").to.be.true;
                  node.onNewBlock(done);
                });
            });
          });
      });
  });

  it("Test transaction without second signature. Should return not ok", function (done) {
    var transaction = node.lisk.transaction.createTransaction("1L",1,account.password,""); //send 1 Lisk to address 1L
    node.peer.post("/transactions")
      .set("Accept", "application/json")
      .set("version",node.version)
      .set("nethash", node.config.nethash)
      .set("port",node.config.port)
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

  it("Test transaction with fake second signature. Should return not ok", function (done) {
    var transaction = node.lisk.transaction.createTransaction("1L",1,account.password, account2.secondPassword); //send 1 Lisk to address 1L
    transaction.signSignature = crypto.randomBytes(64).toString("hex");
    transaction.id = node.lisk.crypto.getId(transaction);
    node.peer.post("/transactions")
      .set("Accept", "application/json")
      .set("version",node.version)
      .set("nethash", node.config.nethash)
      .set("port",node.config.port)
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

  it("Test transaction with second signature. Should return ok", function (done) {
    var transaction = node.lisk.transaction.createTransaction("1L",1,account.password, account.secondPassword); //send 1 Lisk to address 1L
    node.peer.post("/transactions")
      .set("Accept", "application/json")
      .set("version",node.version)
      .set("nethash", node.config.nethash)
      .set("port",node.config.port)
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



  it("Fund new account with second signature and send transaction without second signature. Should return not ok", function (done) {
    node.api.post("/accounts/open")
      .set("Accept", "application/json")
      .set("version",node.version)
      .set("nethash", node.config.nethash)
      .set("port",node.config.port)
      .send({
        secret: account2.password
      })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        //console.log(JSON.stringify(res.body));
        node.expect(res.body).to.have.property("success").to.be.true;
        account2.address = res.body.account.address;
        node.api.put("/transactions")
          .set("Accept", "application/json")
          .set("version",node.version)
          .set("nethash", node.config.nethash)
          .set("port",node.config.port)
          .send({
            secret: node.Gaccount.password,
            amount: node.Fees.secondPasswordFee + 100000000,
            recipientId: account2.address
          })
          .expect("Content-Type", /json/)
          .expect(200)
          .end(function (err, res) {
            //console.log(JSON.stringify(res.body));
            node.expect(res.body).to.have.property("success").to.be.true;
            node.onNewBlock(function (err) {
              node.expect(err).to.be.not.ok;
              var transaction = node.lisk.signature.createSignature(account2.password, account2.secondPassword);

              node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version",node.version)
                .set("nethash", node.config.nethash)
                .set("port",node.config.port)
                .send({
                  transaction: transaction
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                  node.onNewBlock(function (err) { //second signature is enabled after block propagation
                    node.expect(err).to.be.not.ok;
                    var sendTransaction = node.lisk.transaction.createTransaction("1L", 1, account2.password,"");
                    node.peer.post("/transactions")
                      .set("Accept", "application/json")
                      .set("version",node.version)
                      .set("nethash", node.config.nethash)
                      .set("port",node.config.port)
                      .send({
                        transaction: sendTransaction
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
  });

  it("Create transaction from newly funded account and then send second signature to enable", function (done) {
    node.api.post("/accounts/open")
      .set("Accept", "application/json")
      .set("version",node.version)
      .set("nethash", node.config.nethash)
      .set("port",node.config.port)
      .send({
        secret: account3.password
      })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        account3.address = res.body.account.address;
        node.api.put("/transactions")
          .set("Accept", "application/json")
          .send({
            secret: node.Gaccount.password,
            amount: node.Fees.secondPasswordFee+100000000,
            recipientId: account3.address
          })
          .expect("Content-Type", /json/)
          .expect(200)
          .end(function (err, res) {
            node.onNewBlock(function (err) {
              node.expect(err).to.be.not.ok;

              var sendTransaction = node.lisk.transaction.createTransaction("1L", 1, account3.password);
              node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version",node.version)
                .set("nethash", node.config.nethash)
                .set("port",node.config.port)
                .send({
                  transaction: sendTransaction
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                  node.expect(res.body).to.have.property("success").to.be.true;
                  var transaction = node.lisk.signature.createSignature(account3.password, account3.secondPassword);

                  node.peer.post("/transactions")
                    .set("Accept", "application/json")
                    .set("version",node.version)
                    .set("nethash", node.config.nethash)
                    .set("port",node.config.port)
                    .send({
                      transaction: transaction
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                      node.expect(res.body).to.have.property("success").to.be.true;

                      node.onNewBlock(function (err) {
                        node.expect(err).to.be.not.ok;

                        node.api.get("/transactions/get?id=" + sendTransaction.id)
                          .set("Accept", "application/json")
                          .set("version",node.version)
                          .set("nethash", node.config.nethash)
                          .set("port",node.config.port)
                          .expect("Content-Type", /json/)
                          .expect(200)
                          .end(function (err, res) {
                            node.expect(res.body).to.have.property("success").to.be.true;
                            node.expect(res.body).to.have.property("transaction");

                            node.api.get("/transactions/get?id=" + transaction.id)
                              .set("Accept", "application/json")
                              .set("version",node.version)
                              .set("nethash", node.config.nethash)
                              .set("port",node.config.port)
                              .expect("Content-Type", /json/)
                              .expect(200)
                              .end(function (err, res) {
                                node.expect(res.body).to.have.property("success").to.be.true;
                                node.expect(res.body).to.have.property("transaction");

                                done();
                              });
                          });
                      }, 10000);
                    });
                });
            });
          });
      });
  });
});
