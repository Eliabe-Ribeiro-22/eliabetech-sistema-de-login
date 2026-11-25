(function () {
  'use strict';

  angular.module('eliabeTechApp', [])
    .controller('AuthController', ['$http', function ($http) {
      var vm = this;
      vm.mode = 'login';
      vm.busy = false;
      vm.message = '';
      vm.error = '';
      vm.user = null;
      vm.form = {};

      vm.setMode = function (mode) {
        vm.mode = mode;
        vm.message = '';
        vm.error = '';
        vm.form = {};
      };

      vm.submit = function (form) {
        vm.message = '';
        vm.error = '';
        if (form.$invalid) {
          vm.error = 'Confira os campos obrigatórios e tente novamente.';
          return;
        }
        vm.busy = true;
        var payload;
        var endpoint;
        if (vm.mode === 'register') {
          if (vm.form.password !== vm.form.confirmPassword) {
            vm.error = 'As senhas não coincidem.';
            vm.busy = false;
            return;
          }
          endpoint = '/api/auth/register';
          payload = vm.form;
        } else {
          endpoint = '/api/auth/login';
          payload = { email: vm.form.email, password: vm.form.password };
        }
        $http.post(endpoint, payload)
          .then(function (response) {
            vm.message = response.data.message;
            if (vm.mode === 'login') vm.user = response.data.user;
            else vm.setMode('login');
          })
          .catch(function (response) {
            vm.error = response.data && response.data.message ? response.data.message : 'Não foi possível concluir a solicitação.';
          })
          .finally(function () { vm.busy = false; });
      };

      vm.logout = function () {
        $http.post('/api/auth/logout').finally(function () {
          vm.user = null;
          vm.message = 'Sessão encerrada.';
          vm.form = {};
        });
      };

      $http.get('/api/auth/me').then(function (response) {
        vm.user = response.data.user;
      }).catch(angular.noop);
    }]);
}());
