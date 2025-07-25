/**
 * Password strength level estimation according to OWASP password recommendations and entropy
 * https://auth0.com/docs/connections/database/password-strength
 */

const PasswordStrengthLevel = {
    None: 0,
    Low: 1,
    Good: 2
};

const charClasses = new Uint8Array(128);
for (let i = 48 /* '0' */; i <= 57 /* '9' */; i++) {
    charClasses[i] = 1;
}
for (let i = 97 /* 'a' */; i <= 122 /* 'z' */; i++) {
    charClasses[i] = 2;
}
for (let i = 65 /* 'A' */; i <= 90 /* 'Z' */; i++) {
    charClasses[i] = 3;
}

const symbolsPerCharClass = new Uint8Array([
    95 /* ASCII symbols */,
    10 /* digits */,
    26 /* lowercase letters */,
    26 /* uppercase letters */
]);

function passwordStrength(password) {
    if (!password || !password.isProtected) {
        throw new TypeError('Bad password type');
    }

    if (!password.byteLength) {
        return { level: PasswordStrengthLevel.None, length: 0 };
    }

    let length = 0;
    const countByClass = [0, 0, 0, 0];
    let isSingleChar = true;
    let prevCharCode = -1;
    password.forEachChar((charCode) => {
        const charClass = charCode < charClasses.length ? charClasses[charCode] : 0;
        countByClass[charClass]++;
        length++;
        if (isSingleChar) {
            if (charCode !== prevCharCode) {
                if (prevCharCode === -1) {
                    prevCharCode = charCode;
                } else {
                    isSingleChar = false;
                }
            }
        }
    });

    const onlyDigits = countByClass[1] === length;

    if (length < 6) {
        return { level: PasswordStrengthLevel.None, length, onlyDigits };
    }

    if (isSingleChar) {
        return { level: PasswordStrengthLevel.None, length, onlyDigits };
    }

    if (length < 8) {
        return { level: PasswordStrengthLevel.Low, length, onlyDigits };
    }

    let alphabetSize = 0;
    for (let i = 0; i < countByClass.length; i++) {
        if (countByClass[i] > 0) {
            alphabetSize += symbolsPerCharClass[i];
        }
    }

    const entropy = Math.log2(Math.pow(alphabetSize, length));

    const level = entropy < 60 ? PasswordStrengthLevel.Low : PasswordStrengthLevel.Good;
    return { length, level, onlyDigits };
}

export { PasswordStrengthLevel, passwordStrength };
