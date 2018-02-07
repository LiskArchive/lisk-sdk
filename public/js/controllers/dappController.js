require('angular');

angular.module('liskApp').controller('dappController', ['$scope', 'viewFactory', '$stateParams', '$http', "$interval", "userService", "errorModal", "masterPassphraseModal", "openDappModal", "confirmDeletionModal", 'gettextCatalog', function ($scope, viewFactory, $stateParams, $http, $interval, userService, errorModal, masterPassphraseModal, openDappModal, confirmDeletionModal, gettextCatalog) {

    $scope.view = viewFactory;
    $scope.view.inLoading = true;
    $scope.view.loadingText = gettextCatalog.getString('Loading applications');
    $scope.loading = true;
    $scope.installed = false;

    $scope.getTags = function () {
        try {
            return $scope.dapp.tags.split(',');
        }
        catch (err) {
            return []
        }
    }

    $scope.isInstalled = function () {
        $http.get('/api/dapps/installedIds').then(function (response) {
            $scope.installed = (response.data.ids.indexOf($stateParams.dappId) >= 0);
            $scope.loading = false;
        });
    }

    $scope.installingIds = [];
    $scope.uninstallingIds = [];
    $scope.launchedIds = [];

    $scope.isInstalling = function () {
        return ($scope.installingIds.indexOf($stateParams.dappId) >= 0);
    }
    $scope.isLaunched = function () {
        return ($scope.launchedIds.indexOf($stateParams.dappId) >= 0);
    }
    $scope.isUninstalling = function () {
        return ($scope.uninstallingIds.indexOf($stateParams.dappId) >= 0);
    }

    $scope.getInstalling = function () {
        $http.get("/api/dapps/installing").then(function (response) {
            if (response.data.success) {
                $scope.installingIds = response.data.installing;
            }
        });
    };

    $scope.getUninstalling = function () {
        $http.get("/api/dapps/uninstalling").then(function (response) {
            if (response.data.success) {
                $scope.uninstallingIds = response.data.uninstalling;
            }
        });
    };

    $scope.getLaunched = function () {
        $http.get("/api/dapps/launched").then(function (response) {
            if (response.data.success) {
                $scope.launchedIds = response.data.launched;
            }
        });
    };

    // previous != previous :)
    $scope.view.page = {title: '', previous: 'main.dappstore'};
    $scope.view.bar = {};
    $scope.showMore = false;
    $scope.changeShowMore = function () {
        $scope.showMore = !$scope.showMore;
    };

    $http.get("/api/dapps/get?id=" + $stateParams.dappId).then(function (response) {
        $scope.dapp = response.data.dapp;
        $scope.view.page = {title: $scope.dapp.name, previous: 'main.dappstore'};
        $scope.view.inLoading = false;
    });

    $scope.uninstallRequest = function (masterPassphrase) {
        data = {
            "id": $stateParams.dappId
        };
        if (masterPassphrase) {
            data.master = masterPassphrase;
        }
        $http.post("/api/dapps/uninstall", data).then(function (response) {
            $scope.getInstalling();
            $scope.getLaunched();
            $scope.getUninstalling();
            if (response.data.success == true) {
                $scope.installed = false;
            } else {
                $scope.errorModal = errorModal.activate({
                    title: gettextCatalog.getString('Failed to uninstall application'),
                    error: response.data.error,
                    destroy: function () {

                    }
                })
            }
        });
    }

    $scope.uninstallDapp = function () {
        $scope.confirmDeletionModal = confirmDeletionModal.activate({
            destroy: function (yesDelete) {
                if (yesDelete) {
                    if ($scope.ismasterpasswordenabled) {
                        $scope.masterPassphraseModal = masterPassphraseModal.activate({
                            destroy: function (masterPass) {
                                if (masterPass) {
                                    $scope.uninstallRequest(masterPass);
                                }
                            }
                        })
                    } else {
                        $scope.uninstallRequest();
                    }
                }
            }
        })
    }

    $scope.installRequest = function (masterPassphrase) {
        data = {
            "id": $stateParams.dappId
        };
        if (masterPassphrase) {
            data.master = masterPassphrase;
        }
        $scope.installingIds.push($stateParams.dappId);
        $http.post("/api/dapps/install", data).then(function (response) {
            $scope.getInstalling();
            $scope.getLaunched();
            $scope.getUninstalling();
            if (response.data.success == true) {
                $scope.installed = true;
                if ($scope.dapp.type == 1) {
                    $scope.openDapp();
                }
            } else {
                $scope.errorModal = errorModal.activate({
                    title: gettextCatalog.getString('Failed to install application'),
                    error: response.data.error,
                    destroy: function () {

                    }
                })
            }
        });
    }

    $scope.installDapp = function () {
        if ($scope.ismasterpasswordenabled) {
            $scope.masterPassphraseModal = masterPassphraseModal.activate({
                destroy: function (masterPass) {
                    if (masterPass) {
                        $scope.installRequest(masterPass);
                    }
                }
            })
        } else {
            $scope.installRequest();
        }
    }

    $scope.launchRequest = function (masterPass) {
        data = {
            "params": [userService.rememberPassphrase],
            "id": $stateParams.dappId
        }
        if (masterPass) {
            data.master = masterPass;
        }
        $http.post("/api/dapps/launch", data).then(function (response) {
            $scope.getInstalling();
            $scope.getLaunched();
            $scope.getUninstalling();
            if (response.data.success == true) {
                $scope.openDapp();
            } else {
                $scope.errorModal = errorModal.activate({
                    title: gettextCatalog.getString('Failed to launch application'),
                    error: response.data.error,
                    destroy: function () {

                    }
                })
            }
        });
    }

    $scope.runDApp = function (type) {
        if (type == 1) {
            $scope.openDapp();
        } else {
            if ($scope.ismasterpasswordenabled) {
                $scope.masterPassphraseModal = masterPassphraseModal.activate({
                    destroy: function (masterPass) {
                        if (masterPass) {
                            $scope.launchRequest(masterPass);
                        }
                    }
                })
            } else {
                $scope.launchRequest();
            }
        }
    }

    function openDapp (openDapp) {
        if (openDapp) {
            if ($scope.dapp.type == 1) {
                var link = angular.element('<a href="' + $scope.dapp.link + '" target="_blank"></a>');
            } else {
                var link = angular.element('<a href="' +
                    '/dapps/' + $stateParams.dappId + '" target="_blank"></a>');
            }
            angular.element(document.body).append(link);
            link[0].style.display = "none";
            link[0].click();
            link.remove();
        }
    }

    $scope.openDapp = function () {
        openDappModal.activate({ destroy: openDapp });
    }

    $scope.isInstalled();
    $scope.getInstalling();
    $scope.getLaunched();
    $scope.getUninstalling();

    $scope.$on('$destroy', function () {
        $interval.cancel($scope.stateDappInterval);
    });

    $scope.$on('updateControllerData', function (event, data) {
        if (data.indexOf('main.dapps') != -1) {
            $scope.getInstalling();
            $scope.getLaunched();
            $scope.getUninstalling();
        }
    });

}]);
