const chromedriver = require('chromedriver');

module.exports = {
    src_folders: ['tests'],
    page_objects_path: './tests/acceptance/pageObjects',
    webdriver: {
        start_process: true
    },
    test_settings: {
        default: {
            selenium_host: '127.0.0.1',
            webdriver: {
                server_path: chromedriver.path,
                start_process: false,
                port: 4445
            },
            launch_url: 'https://172.17.0.1:4450',
            globals: {},
            desiredCapabilities: {
                browserName: 'chrome',
                javascriptEnabled: true,
                chromeOptions: {
                    args: ['disable-gpu'],
                    w3c: false
                }
            }
        }
    }
};
