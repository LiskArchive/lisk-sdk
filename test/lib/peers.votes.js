var node = require("./../variables.js"),
    crypto = require("crypto");

var test = 0;
var account = node.randomAccount();
var delegate1Voted = false;
var delegate2Voted = false;

var delegate1;
var delegate2;
node.chai.config.includeStack = true;

describe("Testing /peer/transactions API with votes management", function () {
  before(function (done) {
    node.api.get("/delegates/")
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        node.expect(res.body).to.have.property("success").to.be.true;
        if (res.body.success == true){
          delegate1=res.body.delegates[1].publicKey;
          delegate2=res.body.delegates[2].publicKey;

          node.api.get("/accounts/delegates/?address=" + node.Gaccount.address)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
              var transaction=null;
              //console.log(JSON.stringify(res.body));
              node.expect(res.body).to.have.property("success").to.be.true;
              if (res.body.success == true){
                node.expect(res.body).to.have.property("delegates").that.is.an("array");
                if (res.body.delagates !== null) {
                  for (var i = 0; i < res.body.delegates.length; i++) {
                    if (res.body.delegates[i].publicKey == delegate1) {
                      delegate1Voted = true;
                    }
                    else if (res.body.delegates[i].publicKey == delegate2){
                      delegate2Voted = true;
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
              if (!delegate1Voted && !delegate2Voted) {
                transaction = node.lisk.vote.createVote(node.Gaccount.password, ["+"+delegate1, "+"+delegate2]);
              }
              else if (delegate1Voted && !delegate2Voted) {
                transaction = node.lisk.vote.createVote(node.Gaccount.password, ["+"+delegate2]);
              }
              else if (delegate2Voted && !delegate1Voted) {
                transaction = node.lisk.vote.createVote(node.Gaccount.password, ["+"+delegate1]);
              }
              if (transaction!==null) {
                node.peer.post("/transactions")
                  .set("Accept", "application/json")
                  .set("version", node.version)
                  .set("port", node.config.port)
                  .send({
                    transaction: transaction
                  })
                  .expect("Content-Type", /json/)
                  .expect(200)
                  .end(function (err, res) {
                    console.log("Sent vote fix for delegates");
                    console.log("Sent: " + JSON.stringify(transaction) + " Got reply: " + JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    done();
                  });
              }
              else {
                done();
              }
            });
          }
        });
  });

  test = test + 1;
  it("Voting twice for a delegate. Should not be ok", function (done) {
    node.onNewBlock(function (err) {
      var transaction = node.lisk.vote.createVote(node.Gaccount.password, ["+"+delegate1]);
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
          //console.log("Sending POST /transactions with data: " + JSON.stringify(transaction) + " Got reply: " + JSON.stringify(res.body));
          node.expect(res.body).to.have.property("success").to.be.false;
          done();
        });
    });
  });

  test = test + 1;
  it("Removing votes from a delegate. Should be ok", function (done) {
    var transaction = node.lisk.vote.createVote(node.Gaccount.password, ["-"+delegate1]);
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

  test = test + 1;
  it("Removing votes from a delegate and then voting again. Should not be ok", function (done) {
    node.onNewBlock(function (err) {
      var transaction = node.lisk.vote.createVote(node.Gaccount.password, ["-"+delegate2]);
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
          //console.log("Sent POST /transactions with data:" + JSON.stringify(transaction) + "! Got reply:" + JSON.stringify(res.body));
          node.expect(res.body).to.have.property("success").to.be.true;
          var transaction2 = node.lisk.vote.createVote(node.Gaccount.password, ["+"+delegate2]);
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
              //console.log("Sent POST /transactions with data: " + JSON.stringify(transaction2) + "!. Got reply: " + res.body);
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
      .set("nethash", node.config.nethash)
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
          //console.log("Open account failed or account object is null");
          node.expect(true).to.equal(false);
          done();
        }
        node.api.put("/transactions")
          .set("Accept", "application/json")
          .set("version",node.version)
          .set("nethash", node.config.nethash)
          .set("port",node.config.port)
          .send({
            secret: node.Gaccount.password,
            amount: node.Fees.delegateRegistrationFee+node.Fees.voteFee,
            recipientId: account.address
          })
          .expect("Content-Type", /json/)
          .expect(200)
          .end(function (err, res) {
            node.onNewBlock(function (err) {
              node.expect(err).to.be.not.ok;
              account.username = node.randomDelegateName().toLowerCase();
              var transaction = node.lisk.delegate.createDelegate(account.password, account.username);
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
                  done();
                });
            });
          });
      });
  });

  test = test + 1;
  it("Voting for a delegate. Should be ok", function (done) {
    var transaction = node.lisk.vote.createVote(account.password, ["+" + account.publicKey]);
    node.onNewBlock(function (err) {
      node.expect(err).to.be.not.ok;
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
          done();
        });
    });
  });
});
