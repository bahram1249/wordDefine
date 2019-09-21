const request = require('supertest');
const { Word } = require('../../models/word');
const { WordList } = require('../../models/wordList');
const { ONLY_ME, EVERYONE, USER_WITH_PASSWORD } = require('../../models/wordList').enum;
const { User } = require('../../models/user');

let server;
let user;
let title;
let visible;
let addWordBy;
let password;
let wordAccessToken;
let token;

async function createUser(){
    const user = new User({
        name: 'test2',
        email: 'test2@gmail.com',
        password: '123456'
    });
    await user.save();
    return user;
}

async function createSecondUser(){
    const user = new User({
        name: 'test3',
        email: 'test3@gmail.com',
        password: '1234567'
    });
    await user.save();
    return user;
}

async function createWordList(){
    const wordList = new WordList({
        title,
        addWordBy,
        visible,
        password,
        user: user._id
    });
    if(wordList.password) await wordList.calculateHash();
    await wordList.save();
    return wordList;
}

describe('/api/words', () => {
    beforeAll(async(done) => {
        server = require('../../app');
        user = await createUser();
        token = user.generateAuthToken();
        done();
    });

    beforeEach(async(done) => {
        title = 'test WordList';
        addWordBy = ONLY_ME;
        visible = EVERYONE;
        password = undefined;
        done();
    });

    afterEach(async(done) => {
        await Word.deleteMany({});
        await WordList.deleteMany({});
        done();
    });

    afterAll(async(done) => {
        await User.deleteMany({});
        await server.close();
        done();
    });

    describe('GET /', ()=>{

        const exec = async(address)=>{
            return await request(server)
                .get(address)
                .set('x-auth-token', token)
                .set('word-access-token', wordAccessToken)
                .send();
        }

        it('Should return all words', async() => {
            const wordList = await createWordList();
            wordAccessToken = wordList.generateWordAccessToken(user._id);

            const word = new Word({
                name: 'test',
                user: user._id,
                wordList: wordList._id
            });
            await word.save();

            const res = await exec('/api/words');

            expect(res.status).toBe(200);
            expect(res.body.result.length).toBe(1);
            expect(res.body.previousLink).toBeFalsy();
            expect(res.body.nextLink).toBeFalsy();
        });

        it('Should not return any words with someone else word-access-token', async() => {
            const wordList = await createWordList();
            wordAccessToken = wordList.generateWordAccessToken(user._id);

            const word = new Word({
                name: 'test',
                user: user._id,
                wordList: wordList._id
            });
            await word.save();

            const oldToken = token;
            token = new User().generateAuthToken();

            const res = await exec('/api/words');

            token = oldToken;

            expect(res.status).toBe(400);
            expect(res.body.error).toBeTruthy();
            
        });

        it('Should return only 1 result with limit 1', async() => {
            const wordList = await createWordList();
            wordAccessToken = wordList.generateWordAccessToken(user._id);
            let word = [
                {
                    name: 'test',
                    user: user._id,
                    wordList: wordList._id
                },
                {
                    name: 'test 2',
                    user: user._id,
                    wordList: wordList._id
                }
            ]
            await Word.insertMany(word);
    
            const res = await exec('/api/words?limit=1');
    
            expect(res.status).toBe(200);
            expect(res.body.result.length).toBe(1);
            expect(res.body.previousLink).toBeFalsy();
            expect(res.body.nextLink).toBeTruthy();
        });
    
        it('Should return only 1 result with limit 1 in page 2', async() => {
            const wordList = await createWordList();
            wordAccessToken = wordList.generateWordAccessToken(user._id);
            let word = [
                {
                    name: 'test',
                    user: user._id,
                    wordList: wordList._id
                },
                {
                    name: 'test 2',
                    user: user._id,
                    wordList: wordList._id
                }
            ]
            await Word.insertMany(word);
    
            const res = await exec('/api/words?limit=1&page=2');
    
            expect(res.status).toBe(200);
            expect(res.body.result.length).toBe(1);
            expect(res.body.previousLink).toBeTruthy();
            expect(res.body.nextLink).toBeFalsy();
        });
    });
    
    describe('GET /:id', () => {
        const exec = async(address)=>{
            return await request(server)
                .get(address)
                .set('x-auth-token', token)
                .set('word-access-token', wordAccessToken)
                .send();
        }

        it('Should get specific word', async () => {
            const wordList = await createWordList();
            wordAccessToken = wordList.generateWordAccessToken(user._id);

            const word = new Word({
                name: 'test',
                definition: 'test definition',
                user: user._id,
                wordList: wordList._id
            });
            await word.save();

            const res = await exec(`/api/words/${word._id}`);

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
            expect(res.body.result._id).toBe(word._id.toHexString());
            expect(res.body.result.name).toBe(word.name);
            expect(res.body.result.definition).toBe(word.definition);
            expect(res.body.result.wordList).toBe(wordList._id.toHexString());
            expect(res.body.result.user).toBe(user._id.toHexString());
        });
    });

    describe('POST /', () => {
        const exec = async(token, word)=>{
            return await request(server)
                .post('/api/words')
                .set('x-auth-token', token)
                .send(word);
        }

        it('Should create a word', async () => {
            const wordList = await createWordList();
            const word = {
                name: 'test word',
                wordList: wordList._id
            }

            const res = await exec(token, word);

            expect(res.status).toBe(200);
            expect(res.body.result.definition).toBe('unknown');
            expect(res.body.result.wordList).toBe(word.wordList.toHexString());
            expect(res.body.result.name).toBe(word.name);
        });

        it('Should create a word without password for owner of wordList', async () => {
            addWordBy = USER_WITH_PASSWORD;
            password = '123456';
            const wordList = await createWordList();

            const word = {
                name: 'test word',
                wordList: wordList._id
            }

            const res = await exec(token, word);

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
            expect(res.body.result.user).toBe(user._id.toHexString());
            expect(res.body.result.wordList).toBe(wordList._id.toHexString());
        });

        describe('wordList addWordBy is: userWithPassword', () => {
            let newUser;
            let newUserToken;

            beforeAll(async(done)=>{
                newUser = await createSecondUser();
                newUserToken = newUser.generateAuthToken();
                done();
            });

            afterAll(async(done)=>{
                await newUser.remove();
                done();
            });

            it('Should not create a word if password not send it.', async () => {
                addWordBy = USER_WITH_PASSWORD;
                password = '123456';
                const wordList = await createWordList();
    
                const word = {
                    name: 'test word',
                    wordList: wordList._id
                }
    
                const res = await exec(newUserToken, word);
    
                expect(res.status).toBe(403);
                expect(res.body.error).toBeTruthy();
            });
    
            it('Should create a word if password send it', async () => {
                addWordBy = USER_WITH_PASSWORD;
                password = '654321'
                const wordList = await createWordList();

                const word = {
                    name: 'test word',
                    wordList: wordList._id,
                    password
                }
    
                const res = await exec(newUserToken, word);
                const findWord = await Word.findById(res.body.result._id);

                expect(res.status).toBe(200);
                expect(res.body.result).toBeTruthy();
                expect(res.body.result.user).toBe(newUser._id.toHexString());
                expect(res.body.result.wordList).toBe(wordList._id.toHexString());
                expect(findWord).toBeTruthy();
            });
    
            it('Should create a word if wordList addWordBy is everyone', async () => {
                addWordBy = EVERYONE;
                const wordList = await createWordList();
    
                const word = {
                    name: 'test word',
                    wordList: wordList._id
                }
    
                const res = await exec(newUserToken, word);
    
                expect(res.status).toBe(200);
                expect(res.body.result).toBeTruthy();
                expect(res.body.result.user).toBe(newUser._id.toHexString());
                expect(res.body.result.wordList).toBe(wordList._id.toHexString());
            });
        });
    });

    describe('PUT /:id', () => {
        let newUser;
        let newUserToken;

        beforeAll(async(done)=>{
            newUser = await createSecondUser();
            newUserToken = newUser.generateAuthToken();
            done();
        });

        afterAll(async(done)=>{
            await newUser.remove();
            done();
        });

        const exec = async(token, newWord,address)=>{
            return await request(server)
                .put(address)
                .set('x-auth-token', token)
                .send(newWord);
        }

        it('Should update word by the owner of word', async () => {
            addWordBy = USER_WITH_PASSWORD;
            password = '654321';
            const wordList = await createWordList();

            const word = new Word({
                name: 'test word',
                lang: 'fa',
                wordList: wordList._id,
                user: newUser._id
            });
            await word.save();

            const newWord = {
                name: 'test word2',
                wordList: wordList._id,
                lang: 'en'
            }

            const res = await exec(newUserToken, newWord, `/api/words/${word._id}`);

            expect(res.status).toBe(200);
            expect(res.body.result._id).toBe(word._id.toHexString());
            expect(res.body.result.user).toBe(newUser._id.toHexString());
            expect(res.body.result.name).toBe(newWord.name);
            expect(res.body.result.lang).toBe(newWord.lang);
        });

        it('Should update word by the owner of wordList', async () => {
            addWordBy = USER_WITH_PASSWORD;
            password = '654321';
            const wordList = await createWordList();

            const word = new Word({
                name: 'test word',
                wordList: wordList._id,
                user: newUser._id
            });
            await word.save();

            const newWord = {
                name: 'test word2',
                wordList: wordList._id
            }

            const res = await exec(token, newWord, `/api/words/${word._id}`);

            expect(res.status).toBe(200);
            expect(res.body.result._id).toBe(word._id.toHexString());
            expect(res.body.result.user).toBe(newUser._id.toHexString());
            expect(res.body.result.name).toBe(newWord.name);
            expect(res.body.result.wordList).toBe(wordList._id.toHexString());
        });
    });

    describe('DELETE /:id', () => {
        let newUser;
        let newUserToken;

        beforeAll(async(done)=>{
            newUser = await createSecondUser();
            newUserToken = newUser.generateAuthToken();
            done();
        });

        afterAll(async(done)=>{
            await newUser.remove();
            done();
        });

        const exec = async(token, address)=>{
            return await request(server)
                .delete(address)
                .set('x-auth-token', token)
                .send();
        }

        it('Should delete word by the owner of word', async () => {
            addWordBy = USER_WITH_PASSWORD;
            password = '654321';
            const wordList = await createWordList();

            const word = new Word({
                name: 'test word',
                wordList: wordList._id,
                user: newUser._id
            });
            await word.save();

            const res = await exec(newUserToken, `/api/words/${word._id}`);
            const findWord = await Word.findById(word._id);

            expect(res.status).toBe(200);
            expect(res.body.result._id).toBe(word._id.toHexString());
            expect(res.body.result.name).toBe(word.name);
            expect(res.body.result.user).toBe(newUser._id.toHexString());
            expect(res.body.result.wordList).toBe(wordList._id.toHexString());
            expect(findWord).toBeFalsy();
        });

        it('Should delete word by the owner of wordList', async () => {
            addWordBy = USER_WITH_PASSWORD;
            password = '654321';
            const wordList = await createWordList();

            const word = new Word({
                name: 'test word',
                wordList: wordList._id,
                user: newUser._id
            });
            await word.save();

            const res = await exec(token, `/api/words/${word._id}`);
            const findWord = await Word.findById(word._id);

            expect(res.status).toBe(200);
            expect(res.body.result._id).toBe(word._id.toHexString());
            expect(res.body.result.name).toBe(word.name);
            expect(res.body.result.user).toBe(newUser._id.toHexString());
            expect(res.body.result.wordList).toBe(wordList._id.toHexString());
            expect(findWord).toBeFalsy();
        });
    });
});