const fs = require('fs');
const signer = require('pkcs15-smartcard-sign');
const keytar = require('keytar');

const verifyKey = fs.readFileSync('app/resources/public-key.pem');
const key = '02';

function getPin() {
    if (getPin.pin) {
        return Promise.resolve(getPin.pin);
    }
    return keytar.getPassword('keeweb.pin', 'keeweb').then(pass => {
        if (pass) {
            getPin.pin = pass;
            return pass;
        } else {
            throw 'Cannot find PIN';
        }
    });
}

module.exports = function sign(grunt, data) {
    return getPin()
        .then(pin => signer.sign({ data, verifyKey, pin, key }))
        .catch(err => {
            if (grunt) {
                grunt.warn(`Error signing data: ${err}`);
            }
            throw err;
        });
};

module.exports.getPin = getPin;
