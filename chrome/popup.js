function bind(obj) {
   for (const selector in obj) {
      for (const target in obj[selector]) {
         const elem = document.querySelector(selector);
         if (target == 'text') {
            elem.textContent = obj[selector][target];
         } else if (target == 'click') {
            elem.addEventListener(target, obj[selector][target]);
         }
      }
   }
}

class AutofillPopup {
   constructor() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) =>
         this.messageHandler(request, sender, sendResponse));
   }

   onLoad() {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
         this.tab = tabs[0];
         chrome.runtime.sendMessage({type: 'get-creds', url: this.tab.url});
      });
   }

   messageHandler(request, sender, sendResponse) {
      if (request.type == 'creds') {
         this.creds = request;
         this.renderTabCreds();
      }
   }

   renderTabCreds() {
      let elem = document.getElementById('tab-creds');
      elem.style.display = 'block';

      bind({
         '#tab-creds span': {
            text: this.creds.username
         },
         '#tab-creds button': {
            click: () => this.injectCreds()
         }
      });
   }

   injectCreds() {
      chrome.scripting.executeScript({
         target: {tabId: this.tab.id},
         files: ['login-extension.js']
      }, () => {
         chrome.tabs.sendMessage(this.tab.id, this.creds);
      });
   }
}

let popop = new AutofillPopup();
popop.onLoad();
