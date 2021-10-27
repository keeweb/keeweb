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

function updateOptions(url, options) {
    const update = { ...options };
    const isLocal = url.indexOf('/') === 0;
    if (isLocal) {
        update.headers = {
            'Content-Type': 'application/json',
            ...update.headers
        };
        if (typeof options.method !== 'undefined' && !csrfSafeMethod(options.method)) {
            update.headers.RequestVerificationToken = requestVerificationToken;
        }
        update.credentials = 'include';
    }
    return update;
}

function passwordBankFetch(url, options) {
    return fetch(url, updateOptions(url, options));
}

export { csrfSafeMethod, setRequestVerificationToken, passwordBankFetch };
