const request = require('supertest');
const { User } = require('../../models/user');


let server;
let user;

async function createUser(){
    const user = new User({
        name: 'test',
        email: 'test@gmail.com',
        password: '123456'
    });
    await user.calculateHash();
    await user.save();
    return user;
}

describe('/api/auth', () => {
    beforeAll(async(done) => {
        server = require('../../app');
        user = await createUser();
        done();
    });

    afterAll(async(done) => {
        await User.deleteMany({});
        await server.close();
        done();
    });

    describe('POST /', () => {
        const exec = async(userLogin)=>{
            return await request(server)
                .post('/api/auth')
                .send(userLogin);
        }

        it('Should return token back', async() => {
            const userLogin = {
                email: 'test@gmail.com',
                password: '123456'
            }

            const res = await exec(userLogin);

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
        });

        it('Should not return token back if password is incorrect', async() => {
            const userLogin = {
                email: 'test@gmail.com',
                password: '1234567'
            }

            const res = await exec(userLogin);

            expect(res.status).toBe(400);
            expect(res.body.result).toBeFalsy();
        });

        it('Should not return token back if email is not exist', async() => {
            const userLogin = {
                email: 'test2@gmail.com',
                password: '123456'
            }

            const res = await exec(userLogin);

            expect(res.status).toBe(400);
            expect(res.body.result).toBeFalsy();
        });
    });
});