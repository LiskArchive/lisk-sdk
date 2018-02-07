require('angular');

angular.module('liskApp').controller('newUserController', ["$scope", "$http", "newUser", "userService", "$state", "viewFactory", 'gettextCatalog', function ($scope, $http, newUser, userService, $state, viewFactory, gettextCatalog) {

    $scope.step = 1;
    $scope.noMatch = false;
    $scope.view = viewFactory;
    $scope.view.loadingText = gettextCatalog.getString('Registering user');
    $scope.view.inLoading = false;

    $scope.activeLabel = function (pass) {
        return pass != '';
    }

    $scope.generatePassphrase = function () {
        var code = new Mnemonic(Mnemonic.Words.ENGLISH);
        $scope.newPassphrase = code.toString();
    };

    $scope.goToStep = function (step) {
        if (step == 1) {
            $scope.repeatPassphrase = '';
            $scope.noMatch = false;
        }
        $scope.step = step;
    }

    $scope.savePassToFile = function (pass) {
        var blob = new Blob([pass], { type: "text/plain;charset=utf-8" });
        FS.saveAs(blob, "LiskPassphrase.txt");
    }

    $scope.login = function (pass) {
        var data = { secret: pass };
        if (!Mnemonic.isValid(pass) || $scope.newPassphrase != pass) {
            $scope.noMatch = true;
        } else {
            $scope.view.inLoading = true;
            $http.post("/api/accounts/open/", { secret: pass })
                .then(function (resp) {
                    $scope.view.inLoading = false;
                    if (resp.data.success) {
                        newUser.deactivate();
                        userService.setData(resp.data.account.address, resp.data.account.publicKey, resp.data.account.balance, resp.data.account.unconfirmedBalance, resp.data.account.effectiveBalance);
                        userService.setForging(resp.data.account.forging);
                        userService.setSecondPassphrase(resp.data.account.secondSignature);
                        userService.unconfirmedPassphrase = resp.data.account.unconfirmedSignature;
                        $state.go('main.dashboard');
                    } else {
                        console.error("Login failed. Failed to open account.");
                    }
                });
        }
    }

    $scope.close = function () {
        newUser.deactivate();
    }

    $scope.generatePassphrase();

}]);
