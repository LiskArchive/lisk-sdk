require('angular');

angular.module('liskApp').controller('walletsController', ['$scope', '$rootScope', '$http', 'viewFactory', 'ngTableParams', '$filter', 'multiMembersModal', 'multiService', 'userService', "errorModal", 'masterPassphraseModal', 'gettextCatalog', function ($rootScope, $scope, $http, viewFactory, ngTableParams, $filter, multiMembersModal, multiService, userService, errorModal, masterPassphraseModal, gettextCatalog) {

    $scope.view = viewFactory;
    $scope.view.inLoading = false;
    $scope.view.loadingText = gettextCatalog.getString('Loading Multi-Signature Groups');
    $scope.view.page = {title: gettextCatalog.getString('Multi-Signature'), previous: null};
    $scope.view.bar = {showWalletBar: true};
    $scope.secondPassphrase = userService.secondPassphrase;
    $scope.rememberedPassphrase = userService.rememberPassphrase ? userService.rememberedPassphrase : false;
    $scope.countWallets = 0;
    $scope.countPendings = 0;

    $scope.countSign = function (transaction) {
        try {
            return (transaction.signatures ? transaction.signatures.length : 0) + 1;
        }
        catch (err) {
            return 0;
        }
    }

    $scope.signedByUser = function (transaction) {
        try {
            return transaction.signed;
        }
        catch (err) {
            return false;
        }
    }

    $scope.showMembers = function (confirmed, dataMembers, address) {
        dataMembers.push({address: address})
        $scope.multiMembersModal = multiMembersModal.activate({
            confirmed: confirmed,
            dataMembers: dataMembers,
            destroy: function () {
            }
        });
    }

    $scope.confirmRequest = function (transactionId, pass) {
        var queryParams = {
            publicKey: userService.publicKey,
            transactionId: transactionId,
            secret: userService.rememberedPassphrase || pass
        }
        multiService.confirmTransaction(queryParams, function (err) {
            $scope.tableMultiTransactions.reload();
            if (err) {
                $scope.errorModal = errorModal.activate({
                    title: 'Confirmation error',
                    error: err,
                    destroy: function () {

                    }
                })
            }
        })
    }

    $scope.confirmTransaction = function (transactionId) {
        if (!userService.rememberedPassphrase) {
            $scope.masterPassphraseModal = masterPassphraseModal.activate({
                title: 'Enter your password below.',
                label: 'Passphrase',
                destroy: function (pass) {
                    if (pass) {
                        $scope.confirmRequest(transactionId, pass);
                    }
                }
            })
        } else {
            $scope.confirmRequest(transactionId);
        }

    };

    $scope.confirmationsNeeded = function (item) {
        try {
            return item.transaction.type == 8 ? item.transaction.asset.multisignature.keysgroup.length + 1 : item.min;
        }
        catch (err) {
            return 0;
        }

    }

    // Wallets table
    $scope.tableWallets = new ngTableParams({
        page: 1,            // Show first page
        count: 25,
        sorting: {
            address: 'desc' // Initial sorting
        }
    }, {
        counts: [],
        total: 0,
        getData: function ($defer, params) {
            $scope.view.inLoading = true;
            multiService.getWallets($defer, params, $scope.filter, function () {
                $scope.view.inLoading = false;
                $scope.countWallets = params.total();
                $scope.showWallets = !!(!(_.isEmpty(userService.u_multisignatures) || _.isEmpty(userService.multisignatures)) || $scope.countWallets);

            });

        }
    });

    $scope.tableWallets.cols = {
        address : gettextCatalog.getString('Group Name'),
        members : gettextCatalog.getString('Members'),
        confirmations : gettextCatalog.getString('Confirmations')
    };

    $scope.tableWallets.settings().$scope = $scope;

    $scope.$watch("filter.$", function () {
        $scope.tableWallets.reload();
    });
    // end

    // Wallets table
    $scope.tableMultiTransactions = new ngTableParams({
        page: 1,             // Show first page
        count: 10,
        sorting: {
            timestamp: 'asc' // Initial sorting
        }
    }, {
        counts: [],
        total: 0,
        getData: function ($defer, params) {
            $scope.view.inLoading = true;
            multiService.getPendings($defer, params, $scope.filter, function () {
                $scope.view.inLoading = false;
                $scope.countPendings = params.total();
            });
        }
    });

    $scope.tableMultiTransactions.cols = {
        transactionId : gettextCatalog.getString('Transaction ID'),
        recipientId : gettextCatalog.getString('Recipient'),
        timestamp : gettextCatalog.getString('Time'),
        amount : gettextCatalog.getString('Amount'),
        fee : gettextCatalog.getString('Fee'),
        confirmations : gettextCatalog.getString('Confirmations Needed')
    };

    $scope.tableMultiTransactions.settings().$scope = $scope;

    $scope.$watch("filter.$", function () {
        $scope.tableMultiTransactions.reload();
    });
    // end

    $scope.$on('updateControllerData', function (event, data) {
        if (data.indexOf('main.multi') != -1) {
            $scope.updateWallets();
        }
    });

    $scope.updateWallets = function () {
        $scope.tableMultiTransactions.reload();
        $scope.tableWallets.reload();
    };

}]);
