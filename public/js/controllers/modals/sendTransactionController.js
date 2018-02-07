require('angular');

angular.module('liskApp').controller('sendTransactionController', ['$scope', 'sendTransactionModal', '$http', 'userService', 'feeService', '$timeout', '$filter', function ($scope, sendTransactionModal, $http, userService, feeService, $timeout, $filter) {

    $scope.sending = false;
    $scope.passmode = false;
    $scope.accountValid = true;
    $scope.errorMessage = {};
    $scope.checkSecondPass = false;
    $scope.onlyNumbers = /^-?\d*(\.\d+)?$/;
    $scope.secondPassphrase = userService.secondPassphrase;
    $scope.address = userService.address;
    $scope.focus = $scope.to ? 'amount' : 'to';
    $scope.presendError = false;

    $scope.submit = function () {
        console.log('Transaction sent');
    };

    $scope.rememberedPassphrase = userService.rememberPassphrase ? userService.rememberedPassphrase : false;

    Number.prototype.roundTo = function (digitsCount) {
        var digitsCount = typeof digitsCount !== 'undefined' ? digitsCount : 2;
        var s = String(this);
        if (s.indexOf('e') < 0) {
            var e = s.indexOf('.');
            if (e == -1) return this;
            var c = s.length - e - 1;
            if (c < digitsCount) digitsCount = c;
            var e1 = e + 1 + digitsCount;
            var d = Number(s.substr(0, e) + s.substr(e + 1, digitsCount));
            if (s[e1] > 4) d += 1;
            d /= Math.pow(10, digitsCount);
            return d.valueOf();
        } else {
            return this.toFixed(digitsCount);
        }
    }

    Math.roundTo = function (number, digitsCount) {
        number = Number(number);
        return number.roundTo(digitsCount).valueOf();
    }

    function validateForm (onValid) {
        var isAddress = /^[0-9]+[L|l]$/g;
        var correctAddress = isAddress.test($scope.to);

        $scope.errorMessage = {};

        if ($scope.to.trim() == '') {
            $scope.errorMessage.recipient = 'Empty recipient';
            $scope.presendError = true;
        } else {
            if (correctAddress) {
                if ($scope.isCorrectValue($scope.amount)) {
                    return onValid();
                } else {
                    $scope.presendError = true;
                }
            } else {
                $scope.errorMessage.recipient = 'Invalid recipient';
                $scope.presendError = true;
            }
        }
    }

    $scope.passcheck = function (fromSecondPass) {
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
            validateForm(function () {
                $scope.presendError = false;
                $scope.errorMessage = {};
                $scope.sendTransaction($scope.rememberedPassphrase);
            });
        } else {
            validateForm(function () {
                $scope.presendError = false;
                $scope.errorMessage = {};
                $scope.passmode = !$scope.passmode;
                $scope.focus = 'secretPhrase';
                $scope.secretPhrase = '';
            });
        }
    }

    $scope.close = function () {
        if ($scope.destroy) {
            $scope.destroy();
        }
        sendTransactionModal.deactivate();
    }

    $scope.accountChanged = function (e) {
        var string = $scope.to;

        if (!string) {
            return;
        }

        if (string[string.length - 1] == 'L') {
            var isnum = /^\d+$/.test(string.substring(0, string.length - 1));
            if (isnum && string.length - 1 >= 1 && string.length - 1 <= 20) {
                $scope.accountValid = true;
            } else {
                $scope.accountValid = false;
            }
        } else {
            $scope.accountValid = false;
        }
    }

    $scope.getCurrentFee = function () {
        $http.get('/api/blocks/getFee').then(function (resp) {
                $scope.currentFee = resp.data.fee;
                $scope.fee = resp.data.fee;
            });
    }

    $scope.isCorrectValue = function (currency, throwError) {
        var parts = String(currency).trim().split('.');
        var amount = parts[0];
        var fraction;

        if (!throwError) throwError = false;

        function error (message) {
            $scope.errorMessage.amount = message;

            if (throwError) {
              throw $scope.errorMessage.amount;
            } else {
              console.error(message);
              return false;
            }
        }

        if (amount == '') {
            return error('LSK amount can not be blank');
        }

        if (parts.length == 1) {
            // No fractional part
            fraction = '00000000';
        } else if (parts.length == 2) {
            if (parts[1].length > 8) {
                return error('LSK amount must not have more than 8 decimal places');
            } else if (parts[1].length <= 8) {
                // Less than eight decimal places
                fraction = parts[1];
            } else {
                // Trim extraneous decimal places
                fraction = parts[1].substring(0, 8);
            }
        } else {
            return error('LSK amount must have only one decimal point');
        }

        // Pad to eight decimal places
        for (var i = fraction.length; i < 8; i++) {
            fraction += '0';
        }

        // Check for zero amount
        if (amount == '0' && fraction == '00000000') {
            return error('LSK amount can not be zero');
        }

        // Combine whole with fractional part
        var result = amount + fraction;

        // In case there's a comma or something else in there.
        // At this point there should only be numbers.
        if (!/^\d+$/.test(result)) {
            return error('LSK amount contains non-numeric characters');
        }

        // Remove leading zeroes
        result = result.replace(/^0+/, '');

        return parseInt(result);
    }

    $scope.convertLISK = function (currency) {
        return $scope.isCorrectValue(currency, true);
    }

    $scope.clearRecipient = function () {
        $scope.to = '';
    }

    $scope.sendTransaction = function (secretPhrase, withSecond) {
        if ($scope.secondPassphrase && !withSecond) {
            $scope.checkSecondPass = true;
            $scope.focus = 'secondPhrase';
            return;
        }

        $scope.errorMessage = {};

        var data = {
            secret: secretPhrase,
            amount: $scope.convertLISK($scope.amount),
            recipientId: $scope.to,
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

            $http.put('/api/transactions', data).then(function (resp) {
                $scope.sending = false;

                if (resp.data.error) {
                    Materialize.toast('Transaction error', 3000, 'red white-text');
                    $scope.errorMessage.fromServer = resp.data.error;
                } else {
                    if ($scope.destroy) {
                        $scope.destroy();
                    }
                    Materialize.toast('Transaction sent', 3000, 'green white-text');
                    sendTransactionModal.deactivate();
                }
            });
        }
    }

    feeService(function (fees) {
        $scope.fee = fees.send;
    });

}]);
