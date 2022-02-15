import { PasswordGenerator } from './generators/password-generator';
import { Locale } from './locale';
import * as kdbxweb from 'kdbxweb';

let requestVerificationToken;

const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function () {
    // eslint-disable-next-line prefer-spread, prefer-rest-params
    originalOpen.apply(this, arguments);
    // eslint-disable-next-line prefer-rest-params
    const url = arguments[1];
    const isLocal = url.indexOf('/') === 0;
    // eslint-disable-next-line prefer-rest-params
    if (isLocal && !csrfSafeMethod(arguments[0])) {
        this.setRequestHeader('RequestVerificationToken', requestVerificationToken);
    }
};

function setRequestVerificationToken(token) {
    requestVerificationToken = token;
}

function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return /^(GET|HEAD|OPTIONS)$/i.test(method);
}

function updateOptions(url, options, keepContentType) {
    const update = { ...options };
    const isLocal = url.indexOf('/') === 0;
    if (isLocal) {
        update.headers = {
            ...update.headers
        };
        if (!keepContentType) {
            update.headers['Content-Type'] = 'application/json';
        }
        if (typeof options.method !== 'undefined' && !csrfSafeMethod(options.method)) {
            update.headers.RequestVerificationToken = requestVerificationToken;
        }
        update.credentials = 'include';
    }
    return update;
}

function passwordBankFetch(url, options, keepContentType) {
    return fetch(url, updateOptions(url, options, keepContentType));
}

function generatePasswordForDatabase() {
    return PasswordGenerator.generate({
        length: 40,
        upper: true,
        lower: true,
        digits: true
    });
}

// eslint-disable-next-line no-unused-vars
function createKdbxDatabase(title, password) {
    const protectedPassword = kdbxweb.ProtectedValue.fromString(password);
    const credentials = new kdbxweb.Credentials(protectedPassword);
    const db = kdbxweb.Kdbx.create(credentials, title);
    // Argon2d is currently the default, but want to be explicit in case something is changed in the library
    db.setKdf(kdbxweb.Consts.KdfId.Argon2d);
    const ValueType = kdbxweb.VarDictionary.ValueType;
    // The settings below are based on values that are a compromise between security and speed
    // the database takes 0.7 seconds to open on a high-end computer and 7 seconds to open on a mid-range mobile phone
    // For reference and testing see: https://keepass.info/help/base/security.html#secdictprotect
    // Memory: 83 886 080 Bytes => 80 MB
    db.header.kdfParameters.set('M', ValueType.UInt64, kdbxweb.Int64.from(83886080));
    // Iterations: 4 NB! This number is not directly comparable to AES Iterations
    db.header.kdfParameters.set('I', ValueType.UInt64, kdbxweb.Int64.from(4));
    // Parallelism: 1
    db.header.kdfParameters.set('P', ValueType.UInt32, 1);
    return db;
}

async function createSharedPasswordBank(tenantId, title, password, db) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('password', password);
    const dbBytes = await db.save();
    formData.append(
        'kdbx',
        new Blob([dbBytes], { type: 'application/octet-stream' }),
        'passwordbank.kdbx'
    );
    const response = await passwordBankFetch(
        `/api/passwordbank/shared/${tenantId}`,
        {
            method: 'POST',
            'Content-Type': 'multipart/form-data',
            body: formData
        },
        true
    );
    if (!response.ok) {
        await ParseAndThrowError(response);
    }
    return response.json();
}

async function ParseAndThrowError(response) {
    let message = Locale.unknownError;
    if (response.status === 400) {
        const body = await response.json();
        if (body && body.message) {
            message = body.message;
        }
    }
    throw new Error(message);
}

async function deletePasswordBank(path) {
    const splittedPath = path.split('/');
    const passwordBankToDelete = splittedPath[splittedPath.length - 1];
    const response = await passwordBankFetch(
        `/api/passwordbank/delete/${passwordBankToDelete}`,
        {
            method: 'POST'
        },
        true
    );
    if (!response.ok) {
        await ParseAndThrowError(response);
    }
}

export {
    csrfSafeMethod,
    setRequestVerificationToken,
    passwordBankFetch,
    generatePasswordForDatabase,
    createKdbxDatabase,
    createSharedPasswordBank,
    deletePasswordBank
};
