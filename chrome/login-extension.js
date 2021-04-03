chrome.runtime.onMessage.addListener(
   function(message, sender, sendResponse) {
      document.getElementById('login_field').value = message.username;
      document.getElementById('password').value = message.password;
   }
);