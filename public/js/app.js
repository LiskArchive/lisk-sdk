require('angular');
require('angular-ui-router');
require('angular-resource');
require('angular-filter');
require('angular-cookies');
require('browserify-angular-animate');
require('../node_modules/angular-animate/angular-animate.js')
require('../node_modules/angular-gettext/dist/angular-gettext.min.js');
require('../node_modules/angular-chart.js/dist/angular-chart.js');
require('../node_modules/angular-socket-io/socket.js');
require('../node_modules/ng-table/dist/ng-table.js');

Mnemonic = require('bitcore-mnemonic');

liskApp = angular.module('liskApp', ['ui.router', 'btford.modal', 'ngCookies', 'ngTable', 'ngAnimate',  'chart.js', 'btford.socket-io', 'ui.bootstrap', 'angular.filter', 'gettext']);

liskApp.config([
    "$locationProvider",
    "$stateProvider",
    "$urlRouterProvider",
    function ($locationProvider, $stateProvider, $urlRouterProvider) {
        $locationProvider.html5Mode(true);
        $urlRouterProvider.otherwise("/");

        // Now set up the states
        $stateProvider
            .state('main', {
                abstract: true,
                templateUrl: "/partials/template.html",
                controller: "templateController"
            })
            .state('main.dashboard', {
                url: "/dashboard",
                templateUrl: "/partials/account.html",
                controller: "accountController"
            })
            // .state('main.multi', {
            //     url: "/wallets",
            //     templateUrl: "/partials/multi.html",
            //     controller: "walletsController"
            // })
            // .state('main.dappstore', {
            //     url: "/dappstore",
            //     templateUrl: "/partials/dapps.html",
            //     controller: "dappsController"
            // })
            // .state('main.dappsCategory', {
            //     url: "/dappstore/:categoryId",
            //     templateUrl: "/partials/dapps-category.html",
            //     controller: "dappsCategoryController"
            // })
            // .state('main.dappentry', {
            //     url: "/dapp/:dappId",
            //     templateUrl: "/partials/dapp-entry.html",
            //     controller: "dappController"
            // })
            // .state('main.multiPendings', {
            //     url: "/wallets/pendings",
            //     templateUrl: "/partials/wallet-pendings.html",
            //     controller: "walletPendingsController"
            // })
            // .state('main.walletTransactions', {
            //     url: "/wallets/:walletId",
            //     templateUrl: "/partials/wallet-transactions.html",
            //     controller: "walletTransactionsController"
            // })
            .state('main.settings', {
                url: "/settings",
                templateUrl: "/partials/settings.html",
                controller: "settingsController"
            })
            .state('main.transactions', {
                url: "/transactions",
                templateUrl: "/partials/transactions.html",
                controller: "transactionsController"
            })
            .state('main.delegates', {
                url: "/delegates",
                templateUrl: "/partials/delegates.html",
                controller: "delegatesController"
            })
            .state('main.votes', {
                url: "/delegates/votes",
                templateUrl: "/partials/votes.html",
                controller: "votedDelegatesController"
            })
            .state('main.forging', {
                url: "/forging",
                templateUrl: "/partials/forging.html",
                controller: "forgingController"
            })
            .state('main.blockchain', {
                url: "/blockchain",
                templateUrl: "/partials/blockchain.html",
                controller: "blockchainController"
            })
            .state('passphrase', {
                url: "/",
                templateUrl: "/partials/passphrase.html",
                controller: "passphraseController"
            });
    }
]).run(function (languageService, clipboardService) {
    languageService();
    clipboardService();
});
