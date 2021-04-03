window.port = chrome.runtime.connect();
window.port.onMessage.addListener(msg => {
   window.postMessage(msg);
});

window.port.onDisconnect.addListener(() => {
   console.log('app-extension.disconnect');
   setTimeout(() => location.reload(), 1000);
});

window.addEventListener('message', event => {
   console.log('app-extension.message', event);

   // only accept messages from the same frame
   if (event.source !== window) {
      return;
   }

   window.port.postMessage(event.data);
});
