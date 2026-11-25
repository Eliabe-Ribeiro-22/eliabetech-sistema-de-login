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
      vm.twoFactorCode = '';
      vm.setup = null;
      vm.setupCode = '';
      vm.disableCode = '';

      vm.setMode = function (mode) {
        vm.mode = mode;
        vm.message = '';
        vm.error = '';
        vm.form = {};
        vm.twoFactorCode = '';
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
            if (response.data.requiresTwoFactor) vm.mode = 'twoFactorLogin';
            else if (vm.mode === 'login') vm.setUser(response.data.user);
            else if (vm.mode === 'register') vm.setMode('login');
          })
          .catch(function (response) {
            vm.error = response.data && response.data.message ? response.data.message : 'Não foi possível concluir a solicitação.';
          })
          .finally(function () { vm.busy = false; });
      };

      vm.submitTwoFactorLogin = function (form) {
        vm.error = '';
        vm.message = '';
        if (form.$invalid) { vm.error = 'Informe o código de 6 dígitos.'; return; }
        vm.busy = true;
        $http.post('/api/auth/login/2fa', { code: vm.twoFactorCode })
          .then(function (response) { vm.message = response.data.message; vm.setUser(response.data.user); })
          .catch(function (response) { vm.error = response.data?.message || 'Código inválido.'; })
          .finally(function () { vm.busy = false; });
      };

      vm.setUser = function (user) {
        vm.user = user;
        vm.loadProfile();
      };

      vm.loadProfile = function () {
        $http.get('/api/auth/me').then(function (response) { vm.user = response.data.user; }).catch(angular.noop);
      };

      vm.beginTwoFactorSetup = function () {
        vm.error = '';
        vm.message = '';
        vm.busy = true;
        $http.post('/api/auth/2fa/setup')
          .then(function (response) { vm.setup = response.data; vm.message = response.data.message; })
          .catch(function (response) { vm.error = response.data?.message || 'Não foi possível iniciar a configuração.'; })
          .finally(function () { vm.busy = false; });
      };

      vm.enableTwoFactor = function (form) {
        vm.error = '';
        if (form.$invalid) { vm.error = 'Digite o código de 6 dígitos do autenticador.'; return; }
        vm.busy = true;
        $http.post('/api/auth/2fa/enable', { code: vm.setupCode })
          .then(function (response) { vm.message = response.data.message; vm.setup = null; vm.setupCode = ''; vm.loadProfile(); })
          .catch(function (response) { vm.error = response.data?.message || 'Não foi possível ativar o 2FA.'; })
          .finally(function () { vm.busy = false; });
      };

      vm.disableTwoFactor = function (form) {
        vm.error = '';
        if (form.$invalid) { vm.error = 'Digite o código de 6 dígitos do autenticador.'; return; }
        vm.busy = true;
        $http.post('/api/auth/2fa/disable', { code: vm.disableCode })
          .then(function (response) { vm.message = response.data.message; vm.disableCode = ''; vm.loadProfile(); })
          .catch(function (response) { vm.error = response.data?.message || 'Não foi possível desativar o 2FA.'; })
          .finally(function () { vm.busy = false; });
      };

      vm.logout = function () {
        $http.post('/api/auth/logout').finally(function () {
          vm.user = null;
          vm.setup = null;
          vm.message = 'Sessão encerrada.';
          vm.form = {};
          vm.mode = 'login';
        });
      };

      $http.get('/api/auth/me').then(function (response) { vm.user = response.data.user; }).catch(angular.noop);
    }]);
}());
