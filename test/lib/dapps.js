"use strict";

var path = require("path");

// Requires and node configuration
var node = require("./../variables.js");
var test = 0;
var Dapp = {};
var DappName = "";
var DappToInstall = {};
var installedDapp = {};
var randomLISK = 0;
var transactionCount = 0;
var transactionList = [];

// Used for calculating amounts
var expectedFee = 0;
var totalTxFee = 0;

// Create random accounts
var Account1 = node.randomTxAccount();
var Account2 = node.randomTxAccount();
var Account3 = node.randomTxAccount();

console.log("Starting Dapps test suite");

describe("Dapps", function() {

   before(function (done) {
      node.api.post("/accounts/open")
         .set("Accept", "application/json")
         .send({
            secret: Account1.password,
            secondSecret: Account1.secondPassword
         })
         .expect("Content-Type", /json/)
         .expect(200)
         .end(function (err, res) {
            //console.log(JSON.stringify(res.body));
            console.log("Opening Account 1 with password: " + Account1.password);
            node.expect(res.body).to.have.property("success").to.be.true;
            if (res.body.success == true && res.body.account != null){
               Account1.address = res.body.account.address;
               Account1.publicKey = res.body.account.publicKey;
               Account1.balance = res.body.account.balance;
            }
            else {
               console.log("Unable to open account1, tests will fail");
               console.log("Data sent: secret: " + Account1.password + " , secondSecret: " + Account1.secondPassword );
               node.expect("TEST").to.equal("FAILED");
            }
            done();
         });
   });

   before(function (done) {
      node.api.post("/accounts/open")
         .set("Accept", "application/json")
         .send({
            secret: Account2.password,
            secondSecret: Account2.secondPassword
         })
         .expect("Content-Type", /json/)
         .expect(200)
         .end(function (err, res) {
            //console.log("register second password");
            console.log("Opening Account 2 with password: " + Account2.password);
            node.expect(res.body).to.have.property("success").to.be.true;
            if (res.body.success == true && res.body.account != null) {
               Account2.address = res.body.account.address;
               Account2.publicKey = res.body.account.publicKey;
               Account2.balance = res.body.account.balance;
            }
            else{
               console.log("Unable to open account2, tests will fail");
               console.log("Data sent: secret: " + Account2.password + " , secondSecret: " + Account2.secondPassword );
               node.expect("TEST").to.equal("FAILED");
            }
            done();
         });
   });

   before(function (done) {
      node.api.post("/accounts/open")
         .set("Accept", "application/json")
         .send({
            secret: Account3.password,
            secondSecret: Account3.secondPassword
         })
         .expect("Content-Type", /json/)
         .expect(200)
         .end(function (err, res) {
            //console.log(JSON.stringify(res.body));
            console.log("Opening Account 3 with password: " + Account3.password);
            node.expect(res.body).to.have.property("success").to.be.true;
            if (res.body.success == true && res.body.account != null) {
               Account3.address = res.body.account.address;
               Account3.publicKey = res.body.account.publicKey;
               Account3.balance = res.body.account.balance;
            }
            else{
               console.log("Unable to open account3, tests will fail");
               console.log("Data sent: secret: " + Account3.password + " , secondSecret: " + Account3.secondPassword );
               node.expect("TEST").to.equal("FAILED");
            }
            done();
         });
   });

   before(function (done) {
      // Send to LISK to account 1 address
      setTimeout(function() {
         randomLISK = node.randomLISK();
         node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
               secret: node.Gaccount.password,
               amount: randomLISK,
               recipientId: Account1.address
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               if (res.body.success == true && res.body.transactionId != null) {
                  //console.log("Sent to " + Account1.address + " " + (randomLISK / node.normalizer) + " LISK");
                  transactionCount += 1;
                  Account1.transactions.push(transactionCount);
                  Account1.balance += randomLISK;
               }
               else{
                  console.log("Sending LISK to Account1 failed.");
                  console.log("Sent: secret: " + node.Gaccount.password + ", amount: " + randomLISK + ", recipientId: " + Account1.address );
                  node.expect("TEST").to.equal("FAILED");
               }
               done();
            });
      },2000);
   });

   before(function (done) {
      setTimeout(function() {
         randomLISK = node.randomLISK();
         expectedFee = node.expectedFee(randomLISK);
         node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
               secret: node.Gaccount.password,
               amount: randomLISK,
               recipientId: Account2.address
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               //console.log("We send the LISK from genesis account to account. Recipient is: " + Account2.address);
               console.log("Sent to " + Account2.address + " " + (randomLISK / node.normalizer) + " LISK");
               //console.log("Expected fee (paid by sender): " + expectedFee / node.normalizer + " LISK");
               node.expect(res.body).to.have.property("success").to.be.true;
               if (res.body.success == true && res.body.transactionId != null) {
                  Account2.transactions.push(transactionCount);
                  transactionCount += 1;
                  totalTxFee += (expectedFee / node.normalizer);
                  Account2.balance += randomLISK;
                  transactionList[transactionCount - 1] = {
                     "sender": node.Gaccount.address,
                     "recipient": Account2.address,
                     "brutoSent": (randomLISK + expectedFee) / node.normalizer,
                     "fee": expectedFee / node.normalizer,
                     "nettoSent": randomLISK / node.normalizer,
                     "txId": res.body.transactionId,
                     "type":node.TxTypes.SEND
                  }
               }
               else{
                  console.log("Sending LISK to Account2 failed.");
                  console.log("Sent: secret: " + node.Gaccount.password + ", amount: " + randomLISK + ", recipientId: " + Account2.address );
                  node.expect("TEST").to.equal("FAILED");
               }
               done();
            });
      },2000);
   });

   before(function (done) {
      // Wait for new block to ensure all data has been received
      node.onNewBlock(function(err) {
         // Add 2nd password for Account 2
         node.api.put("/signatures")
            .set("Accept", "application/json")
            .send({
               secret: Account2.password,
               secondSecret: Account2.secondPassword
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("transaction").that.is.an("object");
               done();
            });
      });
      //console.log("ACCOUNT 1: " + Account1.address);
      //console.log("ACCOUNT 2: " + Account2.address);
      //console.log("ACCOUNT 3: " + Account3.address);

   });

   describe("Add Dapp", function() {
      node.onNewBlock(function () {
         test += 1;
         it(test + ".Attempting to add Dapp. Invalid secret. We expect error", function (done) {
            node.api.put("/dapps")
               .set("Accept", "application/json")
               .send({
                  secret: "justAR4nd0m Passw0rd",
                  category: node.randomProperty(node.DappCategory),
                  type: node.DappType.DAPP,
                  name: node.randomDelegateName(),
                  description: "A dapp that should not be added",
                  tags: "handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate",
                  link: node.guestbookDapp.link,
                  icon: node.guestbookDapp.icon
               })
               .expect("Content-Type", /json/)
               .expect(200)
               .end(function (err, res) {
                  //console.log(JSON.stringify(res.body));
                  node.expect(res.body).to.have.property("success").to.be.false;
                  node.expect(res.body).to.have.property("error");
                  done();
               });
         });
      });

      test += 1;
      it(test + ".Attempting to add Dapp. Invalid Category. We expect error",function(done){
         node.api.put("/dapps")
            .set("Accept", "application/json")
            .send({
               secret: Account1.password,
               category: "Choo Choo",
               type: node.DappType.DAPP,
               name: node.randomDelegateName(),
               description: "A dapp that should not be added",
               tags: "handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate",
               link: node.guestbookDapp.link,
               icon: node.guestbookDapp.icon
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to add Dapp. No Dapp name. We expect error",function(done){
         node.api.put("/dapps")
            .set("Accept", "application/json")
            .send({
               secret: Account1.password,
               category: node.randomProperty(node.DappCategory),
               type: node.DappType.DAPP,
               description: "A dapp that should not be added",
               tags: "handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate",
               link: node.guestbookDapp.link,
               icon: node.guestbookDapp.icon
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to add Dapp. Very long description. We expect error",function(done){
         node.api.put("/dapps")
            .set("Accept", "application/json")
            .send({
               secret:Account1.password,
               category: node.randomProperty(node.DappCategory),
               type: node.DappType.DAPP,
               name: node.randomDelegateName(),
               description: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient c",
               link: node.guestbookDapp.link,
               icon: node.guestbookDapp.icon
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to add Dapp. Very long tag. We expect error",function(done){
         node.api.put("/dapps")
            .set("Accept", "application/json")
            .send({
               secret: Account1.password,
               category: node.randomProperty(node.DappCategory),
               type: node.DappType.DAPP,
               name: node.randomDelegateName(),
               description: "A dapp that should not be added",
               tags: "develop,rice,voiceless,zonked,crooked,consist,price,extend,sail,treat,pie,massive,fail,maid,summer,verdant,visitor,bushes,abrupt,beg,black-and-white,flight,twist",
               link: node.guestbookDapp.link,
               icon: node.guestbookDapp.icon
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to add Dapp. Very long name. We expect error",function(done){
         node.api.put("/dapps")
            .set("Accept", "application/json")
            .send({
               secret: Account1.password,
               category: node.randomProperty(node.DappCategory),
               type: node.DappType.DAPP,
               name: "Lorem ipsum dolor sit amet, conse",
               description: "A dapp that should not be added",
               tags: "handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate",
               link: node.guestbookDapp.link,
               icon: node.guestbookDapp.icon
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to add Dapp. No link. We expect error",function(done){
         node.api.put("/dapps")
            .set("Accept", "application/json")
            .send({
               secret: Account1.password,
               category: node.randomProperty(node.DappCategory),
               type: node.DappType.DAPP,
               name: node.randomDelegateName(),
               description: "A dapp that should not be added",
               tags: "handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate",
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to add Dapp. Invalid Field type. We expect error",function(done){
         node.api.put("/dapps")
            .set("Accept", "application/json")
            .send({
               secret: Account1.password,
               category: "String",
               type: "Type",
               name: 1234,
               description: 1234,
               tags: 1234,
               link: 1234,
               icon: 1234
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.error;
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to add Dapp. Via Link. 0 LISK account. We expect error",function(done){
         node.api.put("/dapps")
            .set("Accept", "application/json")
            .send({
               secret: Account3.password,
               category: node.randomProperty(node.DappCategory),
               type: node.DappType.DAPP,
               name: node.randomDelegateName(),
               description: "A dapp that should not be added",
               tags: "handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate",
               link: node.guestbookDapp.link,
               icon: node.guestbookDapp.icon
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to add Dapp. Via Link. Invalid 2nd password. We expect error",function(done){
         node.api.put("/dapps")
            .set("Accept", "application/json")
            .send({
               secret: Account2.password,
               secondSecret: null,
               category: node.randomProperty(node.DappCategory),
               type: node.DappType.DAPP,
               name: node.randomDelegateName(),
               description: "A dapp that should not be added",
               tags: "handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate",
               link: node.guestbookDapp.link,
               icon: node.guestbookDapp.icon
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to add Dapp. Via Link. Invalid Type. We expect error",function(done){
         DappName = node.randomDelegateName();
         node.api.put("/dapps")
            .set("Accept", "application/json")
            .send({
               secret: Account1.password,
               secondSecret: null,
               category: node.randomProperty(node.DappCategory),
               type: "INVALIDTYPE",
               name: DappName,
               description: "A dapp that should not be added",
               tags: "handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate",
               link: node.guestbookDapp.link,
               icon: node.guestbookDapp.icon
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to add Dapp. Valid Link. We expect success",function(done){
         node.onNewBlock(function () {
            DappName = node.randomDelegateName();
            node.api.put("/dapps")
               .set("Accept", "application/json")
               .send({
                  secret: Account1.password,
                  category: node.randomProperty(node.DappCategory),
                  type: node.DappType.DAPP,
                  name: DappName,
                  description: "A dapp added via API autotest",
                  tags: "handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate",
                  link: node.guestbookDapp.link,
                  icon: node.guestbookDapp.icon
               })
               .expect("Content-Type", /json/)
               .expect(200)
               .end(function (err, res) {
                  console.log(JSON.stringify(res.body));
                  node.expect(res.body).to.have.property("success").to.be.true;
                  node.expect(res.body.transaction).to.have.property("id");
                  DappToInstall.transactionId = res.body.transaction.id;
                  done();
               });
         });
      });

      test += 1;
      it(test + ".Attempting to add Dapp. Existing Dapp name. We expect error",function(done){
         node.onNewBlock(function(err) {
            node.api.put("/dapps")
               .set("Accept", "application/json")
               .send({
                  secret: Account1.password,
                  category: node.randomProperty(node.DappCategory),
                  type: node.DappType.DAPP,
                  name: DappName,
                  description: "A dapp that should not be added",
                  tags: "handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate",
                  link: node.guestbookDapp.link,
                  icon: node.guestbookDapp.icon
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

      test += 1;
      it(test + ".Attempting to add Dapp. Existing dapp link. We expect error",function(done){
         node.onNewBlock(function(err) {
            node.api.put("/dapps")
               .set("Accept", "application/json")
               .send({
                  secret: Account1.password,
                  category: node.randomProperty(node.DappCategory),
                  type: node.DappType.DAPP,
                  name: node.randomDelegateName(),
                  description: "A dapp that should not be added",
                  tags: "handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate",
                  link: node.guestbookDapp.link,
                  icon: node.guestbookDapp.icon
               })
               .expect("Content-Type", /json/)
               .expect(200)
               .end(function (err, res) {
                  //console.log(JSON.stringify(res.body));
                  node.expect(res.body).to.have.property("success").to.be.false;
                  node.expect(res.body).to.have.property("error");
                  done();
               });
         });
      });

   });

   describe("Get Dapp", function() {

      test += 1;
      it(test + ". Get all Dapps. No limit. We expect success",function(done){
         var category = ""; var name = ""; var type = ""; var link = "";
         var icon = ""; var limit = ""; var offset = ""; var orderBy = "";
         node.onNewBlock(function(err) {
            node.api.get("/dapps")
               .expect("Content-Type", /json/)
               .expect(200)
               .end(function (err, res) {
                  //console.log(JSON.stringify(res.body));
                  node.expect(res.body).to.have.property("success").to.be.true;
                  node.expect(res.body).to.have.property("dapps").that.is.an("array");
                  if (res.body.success == true && res.body.dapps != null){
                     if((res.body.dapps).length > 0){
                        Dapp = res.body.dapps[0];
                        DappToInstall = Dapp;
                     }
                  }
                  else {
                     //console.log(JSON.stringify(res.body));
                     console.log("Request failed or dapps array is null");
                  }
                  done();
               });
         });
      });

      test += 1;
      it(test + ". Get all Dapps. Invalid Parameter types (link). We expect error",function(done){
         var category = "a category"; var name = 1234; var type = "type"; var link = 1234; var icon = 1234;
         node.api.get("/dapps?category=" + category + "&name=" + name + "&type=" + type + "&link=" + link + "&icon=" + icon)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ". Get all Dapps. Ascending order (category). We expect success",function(done){
         var orderBy = "category:asc";
         node.api.get("/dapps?orderBy=" + orderBy)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("dapps").that.is.an("array");
               if (res.body.success == true && res.body.dapps != null) {
                  if (res.body.dapps[0] != null) {
                     for (var i = 0; i < res.body.dapps.length; i++) {
                        if (res.body.dapps[i+1] != null){
                           node.expect(res.body.dapps[i].category).to.be.at.most(res.body.dapps[i+1].category);
                        }
                     }
                  }
               }
               else {
                  //console.log(JSON.stringify(res.body));
                  console.log("Request failed or dapps array is null");
               }
               done();
            });
      });

      test += 1;
      it(test + ". Get all Dapps. Descending order (category). We expect success",function(done){
         var orderBy = "category:desc";
         node.api.get("/dapps?orderBy=" + orderBy)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("dapps").that.is.an("array");
               if (res.body.success == true && res.body.dapps != null){
                  if (res.body.dapps[0] != null){
                     for( var i = 0; i < res.body.dapps.length; i++){
                        if (res.body.dapps[i+1] != null){
                           node.expect(res.body.dapps[i].category).to.be.at.least(res.body.dapps[i+1].category);
                        }
                     }
                  }
               }
               else {
                  //console.log(JSON.stringify(res.body));
                  console.log("Request failed or dapps array is null");
               }
               done();
            });
      });

      test += 1;
      it(test + ". Get Dapps. Limited. We expect success",function(done){
         var limit = 3;
         node.api.get("/dapps?limit=" + limit)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("dapps").that.is.an("array");
               if (res.body.success == true && res.body.dapps != null){
                  node.expect((res.body.dapps).length).to.be.at.most(limit);
               }
               else {
                  //console.log(JSON.stringify(res.body));
                  console.log("Request failed or dapps array is null");
               }
               done();
            });
      });

      test += 1;
      it(test + ". Get Dapps by category. We expect success",function(done){
         var randomCategory = node.randomProperty(node.DappCategory, true);
         node.api.get("/dapps?category=" + randomCategory)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("dapps").that.is.an("array");
               if (res.body.success == true && res.body.dapps != null){
                  if((res.body.dapps).length > 0){
                     node.expect(res.body.dapps[0].category).to.equal(node.DappCategory[randomCategory]);
                  }
               }
               else {
                  //console.log(JSON.stringify(res.body));
                  console.log("Request failed or dapps array is null");
               }
               done();
            });
      });

      test += 1;
      it(test + ". Get Dapps by name. We expect success",function(done){
         var name = "";
         if (Dapp != {} && Dapp != null){
            name = Dapp.name;
         }
         else {
            name = "test";
         }
         node.api.get("/dapps?name=" + name)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               if (name == "test"){
                  node.expect(res.body).to.have.property("success");
               }
               else {
                  node.expect(res.body).to.have.property("success").to.be.true;
                  node.expect(res.body).to.have.property("dapps").that.is.an("array");
                  node.expect(res.body.dapps.length).to.equal(1);
                  if (res.body.success == true && res.body.dapps != null){
                     node.expect(res.body.dapps[0].name).to.equal(name);
                  }
                  else {
                     //console.log(JSON.stringify(res.body));
                     console.log("Request failed or dapps array is null");
                  }
               }
               done()
            });
      });

      test += 1;
      it(test + ". Get Dapps by type. We expect success",function(done){
         var type = node.randomProperty(node.DappType);
         node.api.get("/dapps?type=" + type)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("dapps").that.is.an("array");
               if (res.body.success == true && res.body.dapps != null){
                  for( var i = 0; i < res.body.dapps.length; i++){
                     if (res.body.dapps[i] != null){
                        node.expect(res.body.dapps[i].type).to.equal(type);
                     }
                  }
               }
               else {
                  //console.log(JSON.stringify(res.body));
                  console.log("Request failed or dapps array is null");
               }
               done();
            });
      });

      test += 1;
      it(test + ". Get dapps by link. We expect success",function(done){
         var link = node.guestbookDapp.link;
         node.api.get("/dapps?link=" + link)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("dapps").that.is.an("array");
               if (res.body.success == true && res.body.dapps != null){
                  for( var i = 0; i < res.body.dapps.length; i++){
                     if (res.body.dapps[i] != null){
                        node.expect(res.body.dapps[i].link).to.equal(link);
                     }
                  }
               }
               else {
                  //console.log(JSON.stringify(res.body));
                  console.log("Request failed or dapps array is null");
               }
               done();
            });
      });

      test += 1;
      it(test + ". Get dapps by link. We expect success",function(done){
         var link = node.guestbookDapp.link;
         node.api.get("/dapps?link=" + link)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("dapps").that.is.an("array");
               if (res.body.success == true && res.body.dapps != null){
                  var length = res.body.dapps.length;
                  node.expect(length).to.be.at.most(1);
                  for( var i = 0; i < length; i++){
                     if (res.body.dapps[i] != null){
                        node.expect(res.body.dapps[i].link).to.equal(link);
                     }
                  }
               }
               else {
                  //console.log(JSON.stringify(res.body));
                  console.log("Request failed or dapps array is null");
               }
               done();
            });
      });

      test += 1;
      it(test + ". Get dapps using offset. We expect success",function(done){
         var offset = 1;
         var secondDapp;
         node.api.get("/dapps")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("dapps").that.is.an("array");
               if (res.body.success == true && res.body.dapps != null){
                  if (res.body.dapps[1] != null){
                     secondDapp = res.body.dapps[1];
                     console.log(offset);
                     node.api.get("/dapps?offset=" + offset )
                        .expect("Content-Type", /json/)
                        .expect(200)
                        .end(function (err, res) {
                           //console.log(JSON.stringify(res.body));
                           node.expect(res.body).to.have.property("success").to.be.true;
                           if (res.body.success == true && res.body.dapps != null){
                              node.expect(res.body.dapps[0]).to.deep.equal(secondDapp);
                           }
                        });
                  }
                  else {
                     //console.log(JSON.stringify(res.body));
                     console.log("Only 1 dapp or something went wrong. cannot check offset");
                  }
               }
               else {
                  //console.log(JSON.stringify(res.body));
                  console.log("Request failed or dapps array is null");
               }
               done();
            });
      });
   });

   describe("Get Dapp By ID", function() {

      test += 1;
      it(test + ". Get Dapp by Dapp ID. Unknown ID. We expect error",function(done){
         var dappId = "string";
         node.api.get("/dapps/get?id=" + dappId)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ". Get Dapp by Dapp ID. No ID. We expect error",function(done){
         node.api.get("/dapps/get?id=")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ". Get Dapp by Dapp ID. Valid ID. We expect success",function(done){
         var dappId = DappToInstall.transactionId;
         node.api.get("/dapps/get?id=" + dappId)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("dapp");
               if (res.body.success == true && res.body.dapp != null){
                  node.expect(res.body.dapp.transactionId).to.equal(dappId);
               }
               else {
                  //console.log(JSON.stringify(res.body));
                  console.log("Request failed or dapps array is null");
               }
               done();
            });
      });

   });

   describe("Install Dapp", function() {

      test += 1;
      it(test + ".Attempting to install Dapp. No ID. We expect error",function(done){
         var dappId = DappToInstall.transactionId;
         node.api.post("/dapps/install")
            .set("Accept", "application/json")
            .send({
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to install Dapp. Invalid Type. We expect error",function(done){
         node.api.post("/dapps/install")
            .set("Accept", "application/json")
            .send({
               id: "DAPP ID",
               master: node.config.dapp.masterpassword
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      // Not right test, dapp can be installed before you run this test
      test += 1;
      it(test + ".Attempting to install Dapp (and get InstallingID). Valid ID. We expect success",function(done){
         var dappId = DappToInstall.transactionId;
         node.api.post("/dapps/install")
            .set("Accept", "application/json")
            .send({
               id: dappId,
               master: node.config.dapp.masterpassword
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               node.api.get("/dapps/installing")
                  .expect("Content-Type", /json/)
                  .expect(200)
                  .end(function (err, res) {
                     node.expect(res.body).to.have.property("success").to.be.true;
                     node.expect(res.body).to.have.property("installing").that.is.an("array");
                     if (res.body.success == true && res.body.installing.length > 0){
                        node.expect(res.body.installing[0]).to.equal(dappId);
                     }
                     else {
                        //console.log(JSON.stringify(res.body));
                        console.log("Request failed or installing array is null");
                     }
                  });
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("path");
               if (res.body.success == true){
                  installedDapp = DappToInstall;
               }
               done();
            });
      });

   });

   describe("Get Installed Dapps", function() {

      test += 1;
      it(test + ". Get all installed Dapps. We expect success",function(done){
         var flag = 0;
         node.api.get("/dapps/installed")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("dapps").that.is.an("array");
               if (res.body.success == true && res.body.dapps != null){
                  for (var i = 0; i < res.body.dapps.length; i++){
                     if (res.body.dapps[i] != null){
                        if (res.body.dapps[i].transactionId == DappToInstall.transactionId) {
                           flag += 1;
                        }
                     }
                  }
                  node.expect(flag).to.equal(1);
               }
               else {
                  //console.log(JSON.stringify(res.body));
                  console.log("Request failed or dapps array is null");
               }
               done();
            });
      });

      test += 1;
      it(test + ". Get all installed Dapps IDs. We expect success",function(done){
         var flag = 0;
         node.api.get("/dapps/installedIds")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("ids").that.is.an("array");
               if (res.body.success == true && res.body.ids != null){
                  for (var i = 0; i < res.body.ids.length; i++){
                     if (res.body.ids[i] != null){
                        if (res.body.ids[i] == DappToInstall.transactionId) {
                           flag += 1;
                        }
                     }
                  }
                  node.expect(flag).to.equal(1);
               }
               else {
                  //console.log(JSON.stringify(res.body));
                  console.log("Request failed or dapps array is null");
               }
               done();
            });
      });

   });

   describe("Search Dapps", function() {

      test += 1;
      it(test + ". Search Dapps. Invalid parameters. We expect error",function(done){
         var q = 1234; var category = "good"; var installed = "true";
         node.api.get("/dapps/search?q=" + q + "&category=" + category + "&installed=" + installed)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ". Search for Installed Dapps. We expect success",function(done){
         var q = "a";
         var category = node.randomProperty(node.DappCategory, true);
         var installed = 1;
         node.api.get("/dapps/search?q=" + q + "&installed="+ installed + "&category=" + category)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("dapps").that.is.an("array");
               done();
            });
      });

      test += 1;
      it(test + ". Search for Dapps that are not installed. We expect success",function(done){
         var q = "s";
         var category = node.randomProperty(node.DappCategory);
         var installed = 0;

         node.api.get("/dapps/search?q=" + q + "&installed="+ installed + "&category=" + category)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("dapps").that.is.an("array");
               done();
            });
      });
   });

   describe("Launch Dapp and get Launched Dapps", function() {

      test += 1;
      it(test + ".Attempting to launch Dapp. No ID. We expect error",function(done){
         var dappId = installedDapp.transactionId;
         node.api.post("/dapps/launch")
            .set("Accept", "application/json")
            .send({
               master: node.config.dapp.masterpassword
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to launch Dapp. Unknown ID. We expect error",function(done){
         var dappId = "HELLOW";
         node.api.post("/dapps/launch")
            .set("Accept", "application/json")
            .send({
               id: dappId,
               master: node.config.dapp.masterpassword
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to launch Dapp. Valid ID. We expect success",function(done){
         var dappId = DappToInstall.transactionId;
         node.api.post("/dapps/launch")
            .set("Accept", "application/json")
            .send({
               id: dappId,
               master: node.config.dapp.masterpassword
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.api.get("/dapps/launched")
                  .expect("Content-Type", /json/)
                  .expect(200)
                  .end(function (err, res) {
                     //console.log(JSON.stringify(res.body));
                     node.expect(res.body).to.have.property("success").to.be.true;
                     node.expect(res.body).to.have.property("launched").that.is.an("array");
                     if(res.body.success == true && res.body.launched != null){
                        var flag = 0;
                        for (var i = 0; i < res.body.launched.length; i++){
                           if (res.body.launched[i] != null){
                              if (res.body.launched[i] == dappId){
                                 flag += 1;
                              }
                           }
                        }
                        node.expect(flag).to.equal(1);
                     }
                     else {
                        //console.log(JSON.stringify(res.body));
                        console.log("Request failed or launched array is null");
                     }
                  });
               done();
            });
      });

   });

   describe("Stop Dapp", function() {

      test += 1;
      it(test + ".Attempting to stop Dapp. No ID. We expect error",function(done){
         var dappId = installedDapp.transactionId;
         node.api.post("/dapps/stop")
            .set("Accept", "application/json")
            .send({
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to stop Dapp. Unknown ID. We expect error",function(done){
         var dappId = "HELLOW";
         node.api.post("/dapps/stop")
            .set("Accept", "application/json")
            .send({
               id: dappId,
               master: node.config.dapp.masterpassword
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to stop Dapp. Valid ID. We expect success",function(done){
         var dappId = installedDapp.transactionId;
         node.api.post("/dapps/stop")
            .set("Accept", "application/json")
            .send({
               id: dappId,
               master: node.config.dapp.masterpassword
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               console.log(res.body, dappId);
               node.expect(res.body).to.have.property("success").to.be.true;
               done();
            });
      });

   });

   describe("Get Dapps Categories", function() {

      test += 1;
      it(test + ". Get Dapps categories. We expect success",function(done){
         node.api.get("/dapps/categories")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               node.expect(res.body).to.have.property("categories").that.is.an("object");
               for (var i in node.DappCategory) {
                  node.expect(res.body.categories[i]).to.equal(node.DappCategory[i]);
               }
               done();
            });
      });

   });

   describe("Uninstall Dapp", function() {

      test += 1;
      it(test + ".Attempting to uninstall Dapp. No ID. We expect error",function(done){
         node.api.post("/dapps/uninstall")
            .set("Accept", "application/json")
            .send({
               id: null,
               master: node.config.dapp.masterpassword
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to uninstall Dapp. Unknown ID. We expect error",function(done){
         node.api.post("/dapps/uninstall")
            .set("Accept", "application/json")
            .send({
               id: "UNKNOWN_ID",
               master: node.config.dapp.masterpassword
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.false;
               node.expect(res.body).to.have.property("error");
               done();
            });
      });

      test += 1;
      it(test + ".Attempting to uninstall Dapp (and get UninstallingID). Valid ID. We expect success", function(done) {
         var dappId = installedDapp.transactionId;
         node.api.post("/dapps/uninstall")
            .set("Accept", "application/json")
            .send({
               id: dappId,
               master: node.config.dapp.masterpassword
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
               //console.log(JSON.stringify(res.body));
               node.expect(res.body).to.have.property("success").to.be.true;
               done();
            });
      });

   });

   console.log("Finished Account-test suite");
});
