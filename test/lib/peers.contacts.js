var node = require("./../variables.js"),
  crypto = require("crypto");

var account = node.randomAccount();
var account2 = node.randomAccount();

describe("Peer contacts", function () {
  before(function (done) {
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
        account.address = res.body.account.address;
        account.publicKey = res.body.account.publicKey;
        node.api.put("/transactions")
          .set("Accept", "application/json")
          .set("version",node.version)
          .set("share-port",1)
          .set("port",node.config.port)
          .send({
            secret: node.peers_config.account,
            amount: 100000000000,
            recipientId: account.address
          })
          .expect("Content-Type", /json/)
          .expect(200)
          .end(function (err, res) {
            node.onNewBlock(done);
          });
      });
  });

  it("Add not exists account to contacts. Should return not ok", function (done) {
    var transaction = node.lisk.contact.createContact(account.password, "5819218109212912C");
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
        node.expect(res.body).to.have.property("success").to.be.false;
        done();
      });
  });


  it("Add account to contact with minus. Should be not ok", function (done) {
    var transaction = node.lisk.contact.createContact(account.password, "-" + node.peers_config.address);
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
        node.expect(res.body).to.have.property("success").to.be.false;
        node.onNewBlock(done);
      });
  });



  it("Add account to contact. Should be ok", function (done) {
    var transaction = node.lisk.contact.createContact(account.password, "+" + node.peers_config.address);
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
        node.onNewBlock(done);
      });
  });

  it("Add existing contact to account again. Should return not ok", function (done) {
    var transaction = node.lisk.contact.createContact(account.password, "+" + node.peers_config.address);
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
        node.expect(res.body).to.have.property("success").to.be.false;
        node.onNewBlock(done);
      });
  });
});
