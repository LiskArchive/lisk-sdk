require('angular');

angular.module('liskApp').controller('voteController', ["$scope", "voteModal", "$http", "userService", "feeService", "$timeout", function ($scope, voteModal, $http, userService, feeService, $timeout) {

    $scope.sending = false;
    $scope.passmode = false;
    $scope.fromServer = '';
    $scope.rememberedPassphrase = userService.rememberPassphrase ? userService.rememberedPassphrase : false;
    $scope.secondPassphrase = userService.secondPassphrase;
    $scope.focus = 'secretPhrase';

    Object.size = function (obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };

    $scope.passcheck = function (fromSecondPass) {
        $scope.fromServer=null;
        if (fromSecondPass) {
            $scope.checkSecondPass = false;
            $scope.passmode = $scope.rememberedPassphrase ? false : true;
            if ($scope.passmode) {
                $scope.focus = 'secretPhrase';
            }
            $scope.secondPhrase = '';
            $scope.secretPhrase = '';
            return;
        }
        if ($scope.rememberedPassphrase) {
            $scope.vote($scope.rememberedPassphrase);
        } else {
            $scope.passmode = !$scope.passmode;
            if ($scope.passmode) {
                $scope.focus = 'secretPhrase';
            }
            $scope.secretPhrase = '';
        }
    }

    $scope.secondPassphrase = userService.secondPassphrase;

    $scope.close = function () {
        if ($scope.destroy) {
            $scope.destroy(true);
        }
        voteModal.deactivate();
    }

    $scope.removeVote = function (publicKey) {
        delete $scope.voteList[publicKey];
        delete $scope.pendingList[publicKey];
        if (!Object.size($scope.voteList)) {
            $scope.close();
        }
    }

    $scope.vote = function (pass, withSecond) {
        if ($scope.secondPassphrase && !withSecond) {
            $scope.checkSecondPass = true;
            $scope.focus = 'secondPhrase';
            return;
        }
        pass = pass || $scope.secretPhrase;

        var data = {
            secret: pass,
            delegates: Object.keys($scope.voteList).map(function (key) {
                return ($scope.adding ? '+' : '-') + key;
            }),
            publicKey: userService.publicKey
        };

        if ($scope.secondPassphrase) {
            data.secondSecret = $scope.secondPhrase;
            if ($scope.rememberedPassphrase) {
                data.secret = $scope.rememberedPassphrase;
            }
        }

        if (!$scope.sending) {
            $scope.sending = true;

            $http.put("/api/accounts/delegates", data).then(function (resp) {
                $scope.sending = false;

                if (resp.data.error) {
                    Materialize.toast('Transaction error', 3000, 'red white-text');
                    $scope.fromServer = resp.data.error;
                } else {
                    if ($scope.destroy) {
                        $scope.destroy();
                    }
                    Materialize.toast('Transaction sent', 3000, 'green white-text');
                    voteModal.deactivate();
                }
            });
        }
    }

    feeService(function (fees) {
        $scope.fee = fees.vote;
    });

}]);
