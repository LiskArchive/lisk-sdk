var node = require("./../variables.js"),
    crypto = require("crypto");

var test = 0;
var account = node.randomAccount();
var alreadyVoted = 0;
var alreadyRemoved = 1;
node.chai.config.includeStack = true;

describe("Peers votes", function () {
  before(function (done) {
    node.api.get("/delegates/voters?publicKey=" + node.peers_config.publicKey)
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        console.log(JSON.stringify(res.body));
        node.expect(res.body).to.have.property("success").to.be.true;
        if (res.body.success == true){
          node.expect(res.body).to.have.property("accounts").that.is.an("array");
          if (res.body.accounts != null) {
            for (var i = 0; i < res.body.accounts.length; i++) {
              if (res.body.accounts[i].publicKey == "badf44a77df894ccad87fa62bac892e63e5e39fd972f6a3e6e850ed1a1708e98") {
                alreadyVoted = 1;
              }
              else if (res.body.accounts[i].publicKey == "9062a3b2d585be13b66e705af3f40657a97d0e4a27ec56664e05cdb5c953b0f6"){
                alreadyRemoved = 0;
              }
            }
          }
          else {
            console.log("Accounts returned null. Unable to proceed with test");
          }
        }
        else {
          console.log("Check if already voted request failed or account array null");
          done();
        }
        if (alreadyVoted == 1 && alreadyRemoved == 0) {
          var transaction = node.lisk.vote.createVote(node.peers_config.account, ["+badf44a77df894ccad87fa62bac892e63e5e39fd972f6a3e6e850ed1a1708e98", "+9062a3b2d585be13b66e705af3f40657a97d0e4a27ec56664e05cdb5c953b0f6"]);
        }
        else if (alreadyVoted == 1) {
          var transaction = node.lisk.vote.createVote(node.peers_config.account, ["+badf44a77df894ccad87fa62bac892e63e5e39fd972f6a3e6e850ed1a1708e98"]);
        }
        else if (alreadyRemoved == 0) {
          var transaction = node.lisk.vote.createVote(node.peers_config.account, ["+9062a3b2d585be13b66e705af3f40657a97d0e4a27ec56664e05cdb5c953b0f6"]);
        }
        if (alreadyVoted == 1 || alreadyRemoved == 0) {
          node.peer.post("/transactions")
            .set("Accept", "application/json")
            .set("version", node.version)
            .set("share-port", 1)
            .set("port", node.config.port)
            .send({
              transaction: transaction
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
              console.log("Sent vote fix for delegates. Sent: " + JSON.stringify(transaction) + "Got reply: " + JSON.stringify(res.body));
              node.expect(res.body).to.have.property("success").to.be.true;
              done();
            });
        }
        else {
          done();
        }
      });
  });

  test = test + 1;
  it("Voting twice for a delegate. Should not be ok", function (done) {
    node.onNewBlock(function (err) {
      var transaction = node.lisk.vote.createVote(node.peers_config.account, ["+badf44a77df894ccad87fa62bac892e63e5e39fd972f6a3e6e850ed1a1708e98"]);
      node.peer.post("/transactions")
        .set("Accept", "application/json")
        .set("version", node.version)
        .set("share-port", 1)
        .set("port", node.config.port)
        .send({
          transaction: transaction
        })
        .expect("Content-Type", /json/)
        .expect(200)
        .end(function (err, res) {
          console.log("Sending POST /transactions with data: " + JSON.stringify(transaction) + " Got reply: " + JSON.stringify(res.body));
          node.expect(res.body).to.have.property("success").to.be.false;
          done();
        });
    });
  });

  test = test + 1;
  it("Removing votes from a delegate. Should be ok", function (done) {
    var transaction = node.lisk.vote.createVote(node.peers_config.account, ["-badf44a77df894ccad87fa62bac892e63e5e39fd972f6a3e6e850ed1a1708e98"]);
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
        console.log(JSON.stringify(res.body));
        node.expect(res.body).to.have.property("success").to.be.true;
        done();
      });
  });

  test = test + 1;
  it("Removing votes from a delegate and then voting again. Should not be ok", function (done) {
    node.onNewBlock(function (err) {
      var transaction = node.lisk.vote.createVote(node.peers_config.account, ["-9062a3b2d585be13b66e705af3f40657a97d0e4a27ec56664e05cdb5c953b0f6"]);
      node.peer.post("/transactions")
        .set("Accept", "application/json")
        .set("version", node.version)
        .set("share-port", 1)
        .set("port", node.config.port)
        .send({
          transaction: transaction
        })
        .expect("Content-Type", /json/)
        .expect(200)
        .end(function (err, res) {
          console.log("Sent POST /transactions with data:" + JSON.stringify(transaction) + "! Got reply:" + JSON.stringify(res.body));
          node.expect(res.body).to.have.property("success").to.be.true;
          var transaction2 = node.lisk.vote.createVote(node.peers_config.account, ["+9062a3b2d585be13b66e705af3f40657a97d0e4a27ec56664e05cdb5c953b0f6"]);
          node.peer.post("/transactions")
            .set("Accept", "application/json")
            .set("version", node.version)
            .set("share-port", 1)
            .set("port", node.config.port)
            .send({
              transaction: transaction2
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
              console.log("Sent POST /transactions with data: " + JSON.stringify(transaction2) + "!. Got reply: " + res.body);
              node.expect(res.body).to.have.property("success").to.be.false;
              done();
            });
        });
    });
  });

  // Not right test, because sometimes new block comes and we don't have time to vote
  it("Creating a new delegate. Should be ok.", function (done) {
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
        if (res.body.success == true && res.body.account != null){
          account.address = res.body.account.address;
          account.publicKey = res.body.account.publicKey;
        }
        else {
          console.log("Open account failed or account object is null");
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
            amount: node.Fees.delegateRegistrationFee,
            recipientId: account.address
          })
          .expect("Content-Type", /json/)
          .expect(200)
          .end(function (err, res) {
            node.onNewBlock(function (err) {
              node.expect(err).to.be.not.ok;
              account.username = node.randomDelegateName();
              var transaction = node.lisk.delegate.createDelegate(account.password, account.username);
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
                  node.expect(res.body).to.have.property("success").to.be.true;
                  done();
                });
            });
          });
      });
  });

  test = test + 1;
  it("Voting for a delegate. Should be ok", function (done) {
    var transaction = node.lisk.vote.createVote(node.peers_config.account, ["+" + account.publicKey]);
    node.onNewBlock(function (err) {
      node.expect(err).to.be.not.ok;
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
          done();
        });
    });
  });
});
