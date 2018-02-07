require('angular');
var compareVersion = require('../../node_modules/compare-version/index.js');

angular.module('liskApp').controller('appController', ['dappsService', '$scope', '$rootScope', '$http', "userService", "$interval", "$timeout", 'viewFactory', '$state', 'blockService', 'sendTransactionModal', 'registrationDelegateModal', 'serverSocket', 'delegateService', '$window', 'forgingModal', 'errorModal', 'userInfo', 'transactionsService', 'secondPassphraseModal', 'focusFactory', 'gettextCatalog', function (dappsService, $rootScope, $scope, $http, userService, $interval, $timeout, viewFactory, $state, blockService, sendTransactionModal, registrationDelegateModal, serverSocket, delegateService, $window, forgingModal, errorModal, userInfo, transactionsService, secondPassphraseModal, focusFactory, gettextCatalog) {

    $scope.searchTransactions = transactionsService;
    $scope.searchDapp = dappsService;
    $scope.searchBlocks = blockService;
    $scope.toggled = false;
    $scope.rememberedPassphrase = userService.rememberPassphrase ? userService.rememberedPassphrase : false;
    $scope.lisk_usd = 0;
    $scope.version = 'version load';
    $scope.diffVersion = 0;
    $scope.subForgingCollapsed = true;
    $scope.categories = {};
    $scope.dataToShow = {forging: false}

    $scope.getCategoryName = function (id) {
        for (var key in $scope.categories) {
            if ($scope.categories.hasOwnProperty(key)) {
                if (id == $scope.categories[key]) {
                    return key.toString();
                }
            }
        }
    }

    $scope.getCategories = function () {
        $http.get("/api/dapps/categories").then(function (response) {
            if (response.data.success) {
                $scope.categories = response.data.categories;
            } else {
                $scope.categories = {};
            }
        });

    }

    $scope.collapseMenu = function () {
        $scope.subForgingCollapsed = !$scope.subForgingCollapsed;
    }

    $scope.toggleMenu = function () {
        $scope.toggled = !$scope.toggled;
    }

    $scope.moreDropdownStatus = {
        isopen: false
    };
    $scope.moreNotificationsStatus = {
        isopen: false
    };

    $scope.moreDownTable = {
        isopen: false
    };

    $scope.toggleDropdown = function ($event) {

    };

    $scope.toggled = function (open) {
        if ($scope.checked) {
            $scope.moreDownTable.isopen = true;
        }
    }

    $scope.checked = false;

    $scope.check = function ($event) {
        $event.stopPropagation();
        $scope.checked = true;
    }

    $scope.syncState = 1;

    $scope.loading = {
        labels: ['Total', 'Loaded'],
        values: [0, 100],
        colours: ['#1976d2', '#ffffff'],
        options: {
            percentageInnerCutout: 90,
            animationEasing: "linear",
            segmentShowStroke: false,
            showTooltips: false
        }
    };

    $scope.view = viewFactory;

    $scope.toggleSearchDapps = function () {
        $scope.view.bar.searchDapps = !$scope.view.bar.searchDapps;
        $scope.searchDapp.searchForDappGlobal = '';
    }

    $scope.modules = [
        'main.dashboard',
        'main.delegates',
        'main.transactions',
        'main.votes',
        'main.forging',
        'main.blockchain',
        'passphrase',
        'main.dappstore',
        'main.multi'
    ];

    $scope.getPriceTicker = function () {
        $http.get("https://explorer.lisk.io/api/getPriceTicker")
            .then(function (response) {
                $scope.btc_usd = Math.floor(response.data.tickers.BTC.USD * 1000000) / 1000000;
                $scope.lisk_btc = Math.floor(response.data.tickers.LSK.BTC * 1000000)  / 1000000;
                $scope.lisk_usd = Math.floor(response.data.tickers.LSK.USD * 1000000) / 1000000;
            });
    };

    $scope.getVersion = function () {
        $http.get("/api/peers/version").then(function (response) {
            if (response.data.success) {
                $scope.version = response.data.version;
                $http.get("https://login.lisk.io/api/peers/version").then(function (response) {
                    $scope.latest = response.data.version;
                    $scope.diffVersion = compareVersion($scope.version, $scope.latest);
                });
            } else {
                $scope.diffVersion = -1;
                $scope.version = 'version error';
            }
        });
    };

    $scope.convertToUSD = function (lisk) {
        return (lisk / 100000000) * $scope.lisk_usd;
    };

    $scope.clearSearch = function () {
        $scope.searchTransactions.searchForTransaction = '';
        $scope.searchBlocks.searchForBlock = '';
    }

    $scope.resetAppData = function () {
        $scope.balance = userService.balance = 0;
        $scope.unconfirmedBalance = userService.unconfirmedBalance = 0;

        $scope.secondPassphrase = userService.secondPassphrase = 0;
        $scope.unconfirmedPassphrase = userService.unconfirmedPassphrase = 0;

        userService.multisignatures = userService.u_multisignatures = null;
        $scope.multisignature = false;

        $scope.delegateInRegistration = userService.delegateInRegistration = null;
        $scope.delegate = userService.delegate = null;
        $scope.username = userService.username = null;
    }

    $scope.resetAppData();

    $scope.getAppData = function () {
        $http.get("/api/accounts", {params: {address: userService.address}})
            .then(function (resp) {
                var account = resp.data.account;
                if (!account) {
                    userService.balance = 0;
                    userService.unconfirmedBalance = 0;
                    userService.secondPassphrase = '';
                    userService.unconfirmedPassphrase = '';
                } else {
                    userService.balance = account.balance;
                    userService.unconfirmedBalance = account.unconfirmedBalance;
                    userService.multisignatures = account.multisignatures;
                    userService.u_multisignatures = account.u_multisignatures;
                    userService.secondPassphrase = account.secondSignature || account.unconfirmedSignature;
                    userService.unconfirmedPassphrase = account.unconfirmedSignature;
                    
                }

                $scope.balance = userService.balance;
                $scope.unconfirmedBalance = userService.unconfirmedBalance;
                $scope.secondPassphrase = userService.secondPassphrase;
                $scope.unconfirmedPassphrase = userService.unconfirmedPassphrase;
                $scope.delegateInRegistration = userService.delegateInRegistration;

                if ($state.current.name != 'passphrase') {
                    $scope.getMultisignatureAccounts(function (multisignature) {
                        $scope.multisignature = !_.isEmpty(userService.u_multisignatures) || !_.isEmpty(userService.multisignatures) || multisignature;
                    });
                }

                if ($state.current.name == 'main.dashboard' || $state.current.name == 'main.forging' || $state.current.name == 'main.votes' || $state.current.name == 'main.delegates') {
                    $scope.getForging($scope.setForgingText);
                    $scope.getDelegate();
                }

                if ($state.current.name == 'main.forging' || $state.current.name == 'main.votes' || $state.current.name == 'main.delegates') {
                    $scope.getMyVotesCount();
                    $scope.getForging($scope.setForgingText);
                }

                if ($state.current.name == 'main.dappstore' || 'main.dashboard') {
                    $scope.getCategories();
                }
            });
    };

    $scope.getMasterPassphrase = function () {
        $http.get("api/dapps/ismasterpasswordenabled")
            .then(function (resp) {
                if (resp.data.success) {
                    $scope.ismasterpasswordenabled = resp.data.enabled;
                }
            });
    }

    $scope.sendTransaction = function (to) {
        to = to || '';
        $scope.sendTransactionModal = sendTransactionModal.activate({
            totalBalance: $scope.unconfirmedBalance,
            to: to,
            destroy: function () {
            }
        });
    }

    $scope.setSecondPassphrase = function () {
        $scope.addSecondPassModal = secondPassphraseModal.activate({
            totalBalance: $scope.unconfirmedBalance,
            destroy: function () {
            }
        });
    }

    $scope.enableForging = function () {
        if ($scope.rememberedPassphrase) {
            $http.post("/api/delegates/forging/enable", {
                secret: $scope.rememberedPassphrase,
                publicKey: userService.publicKey
            })
                .then(function (resp) {
                    if (resp.data.success) {
                        userService.setForging(resp.data.success);
                        $scope.forging = resp.data.success;
                        $scope.dataToShow.forging = $scope.forging;
                    } else {
                        $scope.errorModal = errorModal.activate({
                            error: resp.data.error,
                            destroy: function () {
                                $scope.forging = false;
                                $scope.dataToShow.forging = $scope.forging;
                            }
                        })
                    }
                });
        } else {
            $scope.forgingModal = forgingModal.activate({
                forging: false,
                totalBalance: userService.unconfirmedBalance,
                destroy: function (success) {
                    userService.setForging(success);
                    $scope.getForging($scope.setForgingText);
                    $scope.forging = userService.forging;
                    $scope.dataToShow.forging = $scope.forging;

                }
            })
        }
    }

    $scope.disableForging = function () {
        if ($scope.rememberedPassphrase) {

            $scope.error = null;

            $http.post("/api/delegates/forging/disable", {
                secret: $scope.rememberedPassphrase,
                publicKey: userService.publicKey
            })
                .then(function (resp) {
                    if (resp.data.success) {
                        userService.setForging(!resp.data.success);
                        $scope.forging = !resp.data.success;
                        $scope.dataToShow.forging = $scope.forging;
                    } else {
                        $scope.errorModal = errorModal.activate({
                            error: resp.data.error,
                            destroy: function () {
                                $scope.forging = true;
                                $scope.dataToShow.forging = $scope.forging;
                            }
                        })
                    }
                });
        } else {
            $scope.forgingModal = forgingModal.activate({
                forging: true,
                totalBalance: userService.unconfirmedBalance,
                destroy: function () {
                    $scope.forging = userService.forging;
                    $scope.dataToShow.forging = $scope.forging;
                    $scope.getForging($scope.setForgingText);
                }
            })
        }
    }

    $scope.toggleForging = function () {
        if ($scope.forging) {
            $scope.disableForging();
        } else {
            $scope.enableForging();
        }
    }

    $scope.setForgingText = function (forging) {
        if ($state.current.name == 'main.forging' || $state.current.name == 'main.votes' || $state.current.name == 'main.delegates') {
            $scope.forgingStatus = forging ? gettextCatalog.getString('Enabled') : gettextCatalog.getString('Disabled');
            $scope.forgingEnabled = forging;
        } else {
            $scope.forgingStatus = null;
        }
    }

    $scope.getForging = function (cb) {
        $http.get("/api/delegates/forging/status", {params: {publicKey: userService.publicKey}})
            .then(function (resp) {
                $scope.forgingAllowed = resp.data.success;
                $scope.forging = resp.data.enabled;
                $scope.dataToShow.forging = $scope.forging;
                userService.setForging($scope.forging);
                cb($scope.forging);
            });
    }

    $scope.getMultisignatureAccounts = function (cb) {
        var queryParams = {
            publicKey: userService.publicKey
        }

        $http.get("/api/multisignatures/accounts", {
            params: queryParams
        })
            .then(function (response) {
                if (response.data.success) {
                    if (response.data.accounts.length) {
                        return userService.setMultisignature(true, cb);
                    } else {
                        $http.get("/api/multisignatures/pending", {
                            params: queryParams
                        })
                            .then(function (response) {
                                if (response.data.success) {
                                    if (response.data.transactions.length) {
                                        return userService.setMultisignature(true, cb);
                                    } else {
                                        return userService.setMultisignature(false, cb);
                                    }
                                } else {
                                    return userService.setMultisignature(false, cb);
                                }
                            });
                    }
                } else {
                    return userService.setMultisignature(false, cb);
                }
            });
    }

    $scope.registrationDelegate = function () {
        $scope.registrationDelegateModal = registrationDelegateModal.activate({
            totalBalance: userService.unconfirmedBalance,
            destroy: function () {
                $scope.delegateInRegistration = userService.delegateInRegistration;
                $scope.getDelegate();
            }
        })
    }

    $scope.getDelegate = function () {
        delegateService.getDelegate(userService.publicKey, function (response) {
            if (response.username && !$scope.username) {
                $scope.username = response.username;
                userService.username = response.username;
            }
            // if ($scope.delegateInRegistration) {
            //     $scope.delegateInRegistration = !(!!response);
            //     userService.setDelegateProcess($scope.delegateInRegistration);
            // }
            $scope.delegate = response;
            userService.setDelegate($scope.delegate);
            if (!response.noDelegate) {
                $http.get("/api/transactions", {
                    params: {
                        senderPublicKey: userService.publicKey,
                        limit: 1,
                        type: 2
                    }
                }).then(function (response) {
                    if (response.data.success) {
                        userService.setDelegateTime(response.data.transactions);
                    } else {
                        userService.setDelegateTime([{timestamp: null}]);
                    }
                });
            }
        });
    }

    $scope.getSync = function () {
        $http.get("/api/loader/status/sync").then(function (resp) {
            if (resp.data.success) {
                $scope.syncState = (resp.data.syncing && resp.data.blocks) ? Math.floor(100 * resp.data.height / resp.data.blocks) : null;
                if ($scope.syncState != undefined) {
                    $scope.loading.values = [resp.data.height, Math.abs(resp.data.blocks - resp.data.height)];
                }
            }
        });
    }

    $scope.getMyVotesCount = function () {
        $http.get("/api/accounts/delegates/", {params: {address: userService.address}})
            .then(function (response) {
                $scope.myVotesCount = response.data.delegates ? response.data.delegates.length : 0;
            });
    }

    $scope.myUserInfo = function () {
        $scope.modal = userInfo.activate({userId: userService.address});
    }

    $scope.syncInterval = $interval(function () {
        $scope.getSync();
    }, 1000 * 30);

    $scope.getSync();
    $scope.getDelegate();

    $scope.showMenuItem = function (state) {
        return $scope.modules.indexOf(state) != -1;
    }

    $scope.goToPrevious = function () {
        $state.go($scope.view.page.previous);
    }

    $rootScope.$on('$stateChangeSuccess',
        function (event, toState, toParams, fromState, fromParams) {

        });
    $rootScope.$on('$stateChangeStart',
        function (event, toState, toParams, fromState, fromParams) {

        });

    $scope.$on('socket:transactions/change', function (ev, data) {
        $scope.getAppData();
        $scope.updateViews([
            'main.transactions',
            'main.multi',
            'main.dashboard'
        ]);
    });

    $scope.$on('socket:blocks/change', function (ev, data) {
        $scope.getAppData();
        $scope.updateViews([
            'main.blockchain',
            'main.dashboard'
        ]);
    });

    $scope.$on('socket:delegates/change', function (ev, data) {
        $scope.getAppData();
        $scope.updateViews([
            'main.delegates',
            'main.votes',
            'main.forging'
        ]);
    });

    $scope.$on('socket:rounds/change', function (ev, data) {
        $scope.getAppData();
        $scope.updateViews([
            'main.delegates',
            'main.votes',
            'main.forging'
        ]);
    })

    $scope.$on('socket:dapps/change', function (ev, data) {
        $scope.updateViews([
            'main.dapps'
        ]);
    });

    $scope.$on('socket:multisignatures/change', function (ev, data) {
        $scope.getAppData();
        $scope.updateViews([
            'main.multi'
        ]);
    });

    $scope.$on('socket:multisignatures/signatures/change', function (ev, data) {
        $scope.getAppData();
        $scope.updateViews([
            'main.multi'
        ]);
    });

    $window.onfocus = function () {
        $scope.getAppData();
        $scope.updateViews([$state.current.name]);
    }

    $scope.updateViews = function (views) {
        $timeout(function () {
            $scope.$broadcast('updateControllerData', views);
        });
    }

    $scope.getAppData();
    $scope.getPriceTicker();
    $scope.getVersion();
    $scope.getMasterPassphrase();
    $timeout(function () {
        $scope.getVersion();
    }, 60 * 10 * 1000);

}]);
