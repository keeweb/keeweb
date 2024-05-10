/*
 * Phonetic
 * Copyright 2013 Tom Frost
 */

// removed node.js deps, making it available to load in browser

/**
 * Phonetics that sound best before a vowel.
 * @type {Array}
 */
const PHONETIC_PRE = [
    // Simple phonetics
    'b',
    'c',
    'd',
    'f',
    'g',
    'h',
    'j',
    'k',
    'l',
    'm',
    'n',
    'p',
    'qu',
    'r',
    's',
    't',
    // Complex phonetics
    'bl',
    'ch',
    'cl',
    'cr',
    'dr',
    'fl',
    'fr',
    'gl',
    'gr',
    'kl',
    'kr',
    'ph',
    'pr',
    'pl',
    'sc',
    'sh',
    'sl',
    'sn',
    'sr',
    'st',
    'str',
    'sw',
    'th',
    'tr',
    'br',
    'v',
    'w',
    'y',
    'z'
];

/**
 * The number of simple phonetics within the 'pre' set.
 * @type {number}
 */
const PHONETIC_PRE_SIMPLE_LENGTH = 16;

/**
 * Vowel sound phonetics.
 * @type {Array}
 */
const PHONETIC_MID = [
    // Simple phonetics
    'a',
    'e',
    'i',
    'o',
    'u',
    // Complex phonetics
    'ee',
    'ie',
    'oo',
    'ou',
    'ue'
];

/**
 * The number of simple phonetics within the 'mid' set.
 * @type {number}
 */
const PHONETIC_MID_SIMPLE_LENGTH = 5;

/**
 * Phonetics that sound best after a vowel.
 * @type {Array}
 */
const PHONETIC_POST = [
    // Simple phonetics
    'b',
    'd',
    'f',
    'g',
    'k',
    'l',
    'm',
    'n',
    'p',
    'r',
    's',
    't',
    'y',
    // Complex phonetics
    'ch',
    'ck',
    'ln',
    'nk',
    'ng',
    'rn',
    'sh',
    'sk',
    'st',
    'th',
    'x',
    'z'
];

/**
 * The number of simple phonetics within the 'post' set.
 * @type {number}
 */
const PHONETIC_POST_SIMPLE_LENGTH = 13;

/**
 * A mapping of regular expressions to replacements, which will be run on the
 * resulting word before it gets returned.  The purpose of replacements is to
 * address language subtleties that the phonetic builder is incapable of
 * understanding, such as 've' more pronounceable than just 'v' at the end of
 * a word, 'ey' more pronounceable than 'iy', etc.
 * @type {{}}
 */
const REPLACEMENTS = {
    'quu': 'que',
    'qu([aeiou]){2}': 'qu$1',
    '[iu]y': 'ey',
    'eye': 'ye',
    '(.)ye$': '$1y',
    '(^|e)cie(?!$)': '$1cei',
    '([vz])$': '$1e',
    '[iu]w': 'ow'
};

/**
 * Adds a single syllable to the word contained in the wordObj.  A syllable
 * contains, at maximum, a phonetic from each the PRE, MID, and POST phonetic
 * sets.  Some syllables will omit pre or post based on the
 * options.compoundSimplicity.
 *
 * @param {{word, numeric, lastSkippedPre, lastSkippedPost, opts}} wordObj The
 *      word object on which to operate.
 */
function addSyllable(wordObj) {
    const deriv = getDerivative(wordObj.numeric);
    const compound = deriv % wordObj.opts.compoundSimplicity === 0;
    const first = wordObj.word === '';
    const preOnFirst = deriv % 6 > 0;
    if ((first && preOnFirst) || wordObj.lastSkippedPost || compound) {
        wordObj.word += getNextPhonetic(PHONETIC_PRE, PHONETIC_PRE_SIMPLE_LENGTH, wordObj);
        wordObj.lastSkippedPre = false;
    } else {
        wordObj.lastSkippedPre = true;
    }
    wordObj.word += getNextPhonetic(
        PHONETIC_MID,
        PHONETIC_MID_SIMPLE_LENGTH,
        wordObj,
        first && wordObj.lastSkippedPre
    );
    if (wordObj.lastSkippedPre || compound) {
        wordObj.word += getNextPhonetic(PHONETIC_POST, PHONETIC_POST_SIMPLE_LENGTH, wordObj);
        wordObj.lastSkippedPost = false;
    } else {
        wordObj.lastSkippedPost = true;
    }
}

/**
 * Gets a derivative of a number by repeatedly dividing it by 7 and adding the
 * remainders together.  It's useful to base decisions on a derivative rather
 * than the wordObj's current numeric, as it avoids making the same decisions
 * around the same phonetics.
 *
 * @param {number} num A number from which a derivative should be calculated
 * @returns {number} The derivative.
 */
function getDerivative(num) {
    let derivative = 1;
    while (num) {
        derivative += num % 7;
        num = Math.floor(num / 7);
    }
    return derivative;
}

/**
 * Combines the option defaults with the provided overrides.  Available
 * options are:
 *  - seed: A string or number with which to seed the generator.  Using the
 *          same seed (with the same other options) will coerce the generator
 *          into producing the same word.  Default is random.
 *  - phoneticSimplicity: The greater this number, the simpler the phonetics.
 *          For example, 1 might produce 'str' while 5 might produce 's' for
 *          the same syllable.  Minimum is 1, default is 5.
 *  - compoundSimplicity: The greater this number, the less likely the
 *          resulting word will sound "compound", such as "ripkuth" instead of
 *          "riputh".  Minimum is 1, default is 5.
 *
 * @param {{}} overrides A set of options and values with which to override
 *      the defaults.
 * @returns {{seed, phoneticSimplicity, compoundSimplicity}}
 *      An options object.
 */
function getOptions(overrides) {
    const options = {};
    overrides = overrides || {};
    options.length = overrides.length || 16;
    options.seed = overrides.seed || Math.random();
    options.phoneticSimplicity = overrides.phoneticSimplicity
        ? Math.max(overrides.phoneticSimplicity, 1)
        : 5;
    options.compoundSimplicity = overrides.compoundSimplicity
        ? Math.max(overrides.compoundSimplicity, 1)
        : 5;
    return options;
}

/**
 * Gets the next pseudo-random phonetic from a given phonetic set,
 * intelligently determining whether to include "complex" phonetics in that
 * set based on the options.phoneticSimplicity.
 *
 * @param {Array} phoneticSet The array of phonetics from which to choose
 * @param {number} simpleCap The number of 'simple' phonetics at the beginning
 *      of the phoneticSet
 * @param {{word, numeric, lastSkippedPre, lastSkippedPost, opts}} wordObj The
 *      wordObj for which the phonetic is being chosen
 * @param {boolean} [forceSimple] true to force a simple phonetic to be
 *      chosen; otherwise, the function will choose whether to include complex
 *      phonetics based on the derivative of wordObj.numeric.
 * @returns {string} The chosen phonetic.
 */
function getNextPhonetic(phoneticSet, simpleCap, wordObj, forceSimple) {
    const deriv = getDerivative(wordObj.numeric);
    const simple = (wordObj.numeric + deriv) % wordObj.opts.phoneticSimplicity > 0;
    const cap = simple || forceSimple ? simpleCap : phoneticSet.length;
    const phonetic = phoneticSet[wordObj.numeric % cap];
    wordObj.numeric = getNumericHash(wordObj.numeric + wordObj.word);
    return phonetic;
}

/**
 * Generates a numeric hash based on the input data.  The hash is an md5, with
 * each block of 32 bits converted to an integer and added together.
 *
 * @param {string|number} data The string or number to be hashed.
 * @returns {number}
 */
function getNumericHash(data) {
    let numeric = 0;
    data += '-Phonetic';
    for (let i = 0, len = data.length; i < len; i++) {
        const chr = data.charCodeAt(i);
        numeric = (numeric << 5) - numeric + chr;
        numeric >>>= 0;
    }
    return numeric;
}

/**
 * Applies post-processing to a word after it has already been generated.  In
 * this phase, the REPLACEMENTS are executed, applying language intelligence
 * that can make generated words more pronounceable.  The first letter is
 * also capitalized.
 *
 * @param {{word, numeric, lastSkippedPre, lastSkippedPost, opts}} wordObj The
 *      word object to be processed.
 * @returns {string} The processed word.
 */
function postProcess(wordObj) {
    let regex;
    for (const i in REPLACEMENTS) {
        if (Object.prototype.hasOwnProperty.call(REPLACEMENTS, i)) {
            regex = new RegExp(i);
            wordObj.word = wordObj.word.replace(regex, REPLACEMENTS[i]);
        }
    }
    return wordObj.word;
}

/**
 * Generates a new word based on the given options.  For available options,
 * see getOptions.
 *
 * @param {*} [options] A collection of options to control the word generator.
 * @returns {string} A generated word.
 */
function generate(options) {
    options = getOptions(options);
    const length = options.length;
    const wordObj = {
        numeric: getNumericHash(options.seed),
        lastSkippedPost: false,
        word: '',
        opts: options
    };
    const safeMaxLength = length + 5;
    while (wordObj.word.length < safeMaxLength) {
        addSyllable(wordObj);
    }

    return postProcess(wordObj).slice(0, length);
}

const phonetic = { generate };

export { phonetic };
