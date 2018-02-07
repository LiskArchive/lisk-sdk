require('angular');

angular.module('liskApp').filter('decimalFilter', function () {
    return function (fee) {
        if (!fee) {
            return [0][0];
        }

        fee = fee.toString();

        while (fee.length < 9) {
            fee = '0'.concat(fee);
        }

        var intPart = fee.slice(0, -8);
        var decimal = fee.slice(-8);

        var clearView = false;

        while (!clearView) {
            if (decimal[decimal.length - 1] == '0') {
                decimal = decimal.slice(0, decimal.length - 1);
            } else {
                clearView = true;
            }
        }

        return [intPart, decimal];
    }
});
