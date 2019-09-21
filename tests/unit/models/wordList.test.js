const { validate } = require('../../../models/wordList')
const { ONLY_ME, EVERYONE, USER_WITH_PASSWORD } = require('../../../models/wordList').enum
const mongoose = require('mongoose');

describe("WordList Models => validateWordList", ()=>{

    it("Should be pass if data passed correctly", async()=>{
        
        // correct values 1
        let wordList = {
            title: 'sunday',
        }

        let { error } = validate(wordList);
        expect(error).toBeFalsy();

        // correct values 2
        wordList = {
            title: 'sunday',
            visible: ONLY_ME
        }

        error = validate(wordList).error;
        expect(error).toBeFalsy();

        // correct values 3
        wordList = {
            title: 'sunday',
            visible: ONLY_ME,
            addWordBy: ONLY_ME
        }

        error = validate(wordList).error;
        expect(error).toBeFalsy();

        // correct values 4
        wordList = {
            title: 'sunday',
            visible: USER_WITH_PASSWORD,
            addWordBy: ONLY_ME,
            password: '123456'
        }

        error = validate(wordList).error;
        expect(error).toBeFalsy(); 

        // correct values 5
        wordList = {
            title: 'sunday',
            visible: EVERYONE,
            addWordBy: USER_WITH_PASSWORD,
            password: '123456'
        }

        error = validate(wordList).error;
        expect(error).toBeFalsy();

    })

    it(`Should be error if wordList visible is ${USER_WITH_PASSWORD} and password is not passed`, async()=>{

        const wordList = {
            title: 'sunday',
            visible: USER_WITH_PASSWORD
        }

        const { error } = validate(wordList);
        expect(error).toBeDefined();
    })

    it(`Should be error if wordList addWordBy is ${USER_WITH_PASSWORD} and password is not passed`, async()=>{

        const wordList = {
            title: 'sunday',
            visible: EVERYONE,
            addWordBy: USER_WITH_PASSWORD
        }

        const { error } = validate(wordList);
        expect(error).toBeDefined();
    })

    it('Should be error if wordList visible is not an enum', async()=>{

        const wordList = {
            title: 'sunday',
            visible: 'something'
        }

        const { error } = validate(wordList);
        expect(error).toBeDefined();
    })
})