const { validate, languagesEnum } = require('../../../models/word')
const mongoose = require('mongoose')

function randomIntInc(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low)
}

function createWord(){
    const word = {
        name: 'hard',
        definition: 'not easy',
        examples: 'the footbal is easy',
        wordList: mongoose.Types.ObjectId().toHexString(),
        lang: languagesEnum[randomIntInc(0, languagesEnum.length - 1)]
    }
    return word;
}
describe("Word Models => validateWord", ()=>{

    it('Should be pass if data is correct', async () => {
        // correct values 1
        let word = createWord();
        word.lang = undefined;
        word.examples = undefined;

        let { error } = validate(word);
        expect(error).toBeFalsy();

        // correct values 2
        word = createWord().examples = undefined;

        error = validate(word).error;
        expect(error).toBeFalsy();

        // correct values 3
        word = createWord();

        error = validate(word).error;
        expect(error).toBeFalsy();
    })

    it('Should be error if the lang not match to enum', async () => {
        const word = createWord().lang = 'eng';

        const { error } = validate(word);
        expect(error).toBeDefined();
    })

    it('Should be error if wordList is not a mongoose objectId', async () => {
        const word = createWord().wordList = '1'

        const { error } = validate(word);
        expect(error).toBeDefined();

    })

    it('Should be error if wordList not passed', async () => {
        const word = createWord().wordList = undefined;

        const { error } = validate(word);
        expect(error).toBeDefined();
    })

})