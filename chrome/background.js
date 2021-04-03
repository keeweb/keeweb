let keewebPort;

chrome.runtime.onMessage.addListener(
   function(request, sender, sendResponse) {
      console.log('onMessage', request);
      if (request.type == 'get-creds') {
         if (keewebPort) {
            keewebPort.postMessage(request);
         }
      }
   }
);

chrome.runtime.onConnect.addListener(port => {
   console.log('onConnect');
   keewebPort = port;

   port.onMessage.addListener(msg => {
      console.log('port.onMessage', msg);
      if (msg.type == 'creds') {
         chrome.runtime.sendMessage(msg);
      }
   });

   port.onDisconnect.addListener(() => {
      console.log('port.onDisconnect');
   });
});
