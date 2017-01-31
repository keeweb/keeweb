'use strict';

const bootstrap = () => {
    require('./bootstrap');
}

if(window.cordova) {
    document.addEventListener('deviceready', bootstrap, false);
} else {
    bootstrap();
}