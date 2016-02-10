var node = require("./../variables.js"),
  crypto = require("crypto");

var account = node.randomAccount();
var account2 = node.randomAccount();

describe("Peers usernames", function () {
  it("Register username on new account and then try to register another username. Should return not ok", function (done) {
    var transaction = node.lisk.username.createUsername(node.peers_config.account, node.randomDelegateName());
    transaction.fee = node.Fees.usernameFee;

    node.peer.post("/transactions")
      .set("Accept", "application/json")
      .set("version",node.version)
      .set("share-port",1)
      .set("port",node.config.port)
      .send({
        transaction: transaction
      })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        console.log("Sent: POST /transactions with data:" + JSON.stringify(transaction) + "! Got Reply: " + JSON.stringify(res.body));
        node.expect(res.body).to.have.property("success").to.be.true;
        transaction = node.lisk.username.createUsername(node.peers_config.account, node.randomAccount());
        transaction.fee = node.Fees.usernameFee;

        node.peer.post("/transactions")
          .set("Accept", "application/json")
          .set("version",node.version)
          .set("share-port",1)
          .set("port",node.config.port)
          .send({
            transaction: transaction
          })
          .expect("Content-Type", /json/)
          .expect(200)
          .end(function (err, res) {
            node.expect(res.body).to.have.property("success").to.be.false;
            done();
          });
      });
  });

  it("Register delegate and then username. Should return not ok", function (done) {
    node.api.post("/accounts/open")
      .set("Accept", "application/json")
      .set("version",node.version)
      .set("share-port",1)
      .set("port",node.config.port)
      .send({
        secret: account.password
      })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        console.log("Opening Account with secret= " + account.password + " Got reply: " + JSON.stringify(res.body));
        if(res.body.success == true && res.body.account.address != null){
          account.address = res.body.account.address;
        }
        else {
          console.log("Couldn"t open account. Test failed");
          node.expect(true).to.equal(false);
          done();
        }
        node.api.put("/transactions")
          .set("Accept", "application/json")
          .set("version",node.version)
          .set("share-port",1)
          .set("port",node.config.port)
          .send({
            secret: node.peers_config.account,
            amount: 1500000000000,
            recipientId: account.address
          })
          .expect("Content-Type", /json/)
          .expect(200)
          .end(function (err, res) {
            node.onNewBlock(function (err) {
              console.log("We sent LISK to account. We got answer: " + JSON.stringify(res.body));
              node.expect(err).to.be.not.ok;
              var transaction = node.lisk.delegate.createDelegate(account.password, node.randomDelegateName());
              transaction.fee = node.Fees.delegateRegistrationFee;

              node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version",node.version)
                .set("share-port",1)
                .set("port",node.config.port)
                .send({
                  transaction: transaction
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                  console.log("We tried to create delegate. Got answer: " + JSON.stringify(res.body));
                  node.expect(res.body).to.have.property("success").to.be.true;
                  transaction = node.lisk.username.createUsername(account.password, node.randomDelegateName());
                  transaction.fee = node.Fees.usernameFee;

                  node.peer.post("/transactions")
                    .set("Accept", "application/json")
                    .set("version",node.version)
                    .set("share-port",1)
                    .set("port",node.config.port)
                    .send({
                      transaction: transaction
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                      console.log("Tried to register username. Got answer: " + JSON.stringify(res.body));
                      node.expect(res.body).to.have.property("success").to.be.false;
                      done();
                    });
                });
            });
          });
      });
  });


  it("Register username and then register delegate. Should return not ok", function (done) {
    node.api.post("/accounts/open")
      .set("Accept", "application/json")
      .set("version",node.version)
      .set("share-port",1)
      .set("port",node.config.port)
      .send({
        secret: account2.password
      })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        account2.address = res.body.account.address;
        node.api.put("/transactions")
          .set("Accept", "application/json")
          .set("version",node.version)
          .set("share-port",1)
          .set("port",node.config.port)
          .send({
            secret: node.peers_config.account,
            amount: 1500000000000,
            recipientId: account2.address
          })
          .expect("Content-Type", /json/)
          .expect(200)
          .end(function (err, res) {
            node.onNewBlock(function (err) {
              node.expect(err).to.be.not.ok;
              var transaction = node.lisk.username.createUsername(account2.password, node.randomDelegateName());
              transaction.fee = node.Fees.usernameFee;

              node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version",node.version)
                .set("share-port",1)
                .set("port",node.config.port)
                .send({
                  transaction: transaction
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                  node.expect(res.body).to.have.property("success").to.be.true;

                  node.onNewBlock(function () {
                    transaction = node.lisk.delegate.createDelegate(account2.password, node.randomDelegateName());
                    transaction.fee = node.Fees.delegateRegistrationFee;

                    node.peer.post("/transactions")
                      .set("Accept", "application/json")
                      .set("version",node.version)
                      .set("share-port",1)
                      .set("port",node.config.port)
                      .send({
                        transaction: transaction
                      })
                      .expect("Content-Type", /json/)
                      .expect(200)
                      .end(function (err, res) {
                        console.log(res.body);
                        node.expect(res.body).to.have.property("success").to.be.false;
                        done();
                      });
                  });
                });

            }, 10000);
          });
      });
  });
});
