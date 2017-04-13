var wc1 = require('./api/ws/workersController');
var wc2 = require('./api/ws/workersController');

wc1.registerWorkerReceiver('A', function () {

});


wc2.registerWorkerReceiver('B', function () {

});

console.log("RES", wc2.registeredReceivers);