require('./api/ws/workers/connectionsTable');
require('./api/ws/workers/peersUpdateRules');
require('./api/ws/workers/rules');
require('./api/ws/workers/slaveToMasterSender');

require('./helpers/bignum');
require('./helpers/bson');
require('./helpers/checkIpInList');
require('./helpers/cache');
require('./helpers/config');
require('./helpers/ed');
require('./helpers/httpApi');
require('./helpers/jobs-queue');
require('./helpers/peersManager');
require('./helpers/pg-notify');
require('./helpers/promiseDefer');
require('./helpers/request-limiter');
require('./helpers/router');
require('./helpers/RPC');
require('./helpers/slots');
require('./helpers/RPC');
require('./helpers/request-limiter.js');
require('./helpers/wsApi');
require('./helpers/z_schema-express');
require('./helpers/z_schema');

require('./logic/account');
require('./logic/delegate');
require('./logic/peer');
require('./logic/peers');
require('./logic/multisignature');
require('./logic/transaction');
require('./logic/transfer');
require('./logic/vote');

require('./modules/blocks/process');
require('./modules/blocks/verify');
require('./modules/accounts');
require('./modules/app');
require('./modules/blocks');
require('./modules/cache');
require('./modules/delegates');
require('./modules/loader');
require('./modules/peers');
require('./modules/transactions');

require('./sql/delegatesList');
require('./sql/rounds');

<<<<<<< HEAD
require('./schema/delegates');
=======
require('./sql/blockRewards.js');
require('./sql/delegatesList.js');
require('./sql/rounds.js');
<<<<<<< HEAD
*/
require('./helpers/checkIpInList');
require('./helpers/config');
>>>>>>> b1a06dec... reverting to the original before switching branches
=======
>>>>>>> 09cf5c1b... Added the two new unit tests to the index.js file.
