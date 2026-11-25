(function () {
  'use strict';
  var status = document.getElementById('status');
  var loginLink = document.getElementById('login-link');
  var token = new URLSearchParams(window.location.search).get('token');
  if (!token) {
    status.className = 'alert alert-danger';
    status.textContent = 'O link está incompleto ou inválido. Faça o cadastro novamente.';
    return;
  }
  fetch('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token })
  }).then(function (response) {
    return response.json().then(function (data) {
      if (!response.ok) throw new Error(data.message || 'Não foi possível confirmar o email.');
      return data;
    });
  }).then(function (data) {
    status.className = 'alert alert-success';
    status.textContent = data.message;
    loginLink.hidden = false;
  }).catch(function (error) {
    status.className = 'alert alert-danger';
    status.textContent = error.message;
  });
}());
