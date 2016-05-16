var node = require("./../variables.js"),
  crypto = require("crypto");

var genesisblock = require("../../genesisBlock.json");

describe("Testing /peer/transactions API with sending LISK", function () {

  it("create good transaction sent with wrong nethash on header. should fail", function (done) {
    var transaction = node.lisk.transaction.createTransaction("1L", 1, node.Gaccount.password);
    node.peer.post("/transactions")
      .set("Accept", "application/json")
      .set("version",node.version)
      .set("nethash", "wrongnethash")
      .set("port",node.config.port)
      .send({
        transaction: transaction
      })
      .expect("Content-Type", /json/)
      .expect(200)
      .end(function (err, res) {
        console.log(JSON.stringify(res.body));
        node.expect(res.body).to.have.property("success").to.be.false;
        node.expect(res.body.expected).to.equal(node.config.nethash);
        done();
      });
  });

  it("create same good transaction sent with right nethash on header. should return ok", function (done) {
    var transaction = node.lisk.transaction.createTransaction("1L", 1, node.Gaccount.password);
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

  it("create transaction with undefined recipientId. should return not ok", function (done) {
    var transaction = node.lisk.transaction.createTransaction(undefined, 1, node.Gaccount.password);
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
        node.expect(res.body).to.have.property("message");
        done();
      });
  });

  it("create transaction with negative amount. should return not ok", function (done) {
    var transaction = node.lisk.transaction.createTransaction("1L", -1, node.Gaccount.password);
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
        node.expect(res.body).to.have.property("message");
        done();
      });
  });

  it("create transaction with recipient and then change it to verify signature. should return not ok", function (done) {
    var transaction = node.lisk.transaction.createTransaction("12L", 1, node.Gaccount.password);
    transaction.recipientId = "1L";
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
        node.expect(res.body).to.have.property("message");
        done();
      });
  });

  it("create transaction with no balance on sender. should return not ok", function (done) {
    var transaction = node.lisk.transaction.createTransaction("1L", 1, "randomstring");
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
        node.expect(res.body).to.have.property("message");
        done();
      });
  });

  it("create transaction with fake signature. should return not ok", function (done) {
    var transaction = node.lisk.transaction.createTransaction("12L", 1, node.Gaccount.password);
    transaction.signature = crypto.randomBytes(64).toString("hex");
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
        node.expect(res.body).to.have.property("message");
        done();
      });
  });

  it("create transaction with no hex data for bytes values (public key/signature). should return not ok", function (done) {
    var transaction = node.lisk.transaction.createTransaction("12L", 1, node.Gaccount.password);
    transaction.signature = node.randomPassword();
    transaction.senderPublicKey = node.randomPassword();
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
        node.expect(res.body).to.have.property("message");
        done();
      });
  });

  it("send transaction with very large amount and genesis block id. should return not ok", function (done) {
    var transaction = node.lisk.transaction.createTransaction("12L", 10000000000000000, node.Gaccount.password);
    transaction.blockId = genesisblock.id;
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
        setTimeout(done, 30000);
      });
  });

  it("send very large number in transaction. should return not ok", function (done) {
    var transaction = node.lisk.transaction.createTransaction("12L", 184819291270000000012910218291201281920128129, node.Gaccount.password);
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
        node.expect(res.body).to.have.property("message");
        done();
      });
  });

  it("send float number in transaction, should return not ok", function (done) {
    var transaction = node.lisk.transaction.createTransaction("12L", 1.3, node.Gaccount.password);
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
        node.expect(res.body).to.have.property("message");
        done();
      });
  });
});
