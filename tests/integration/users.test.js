const request = require('supertest');
const { User } = require('../../models/user');

let server;
let token;

describe('/api/users', () => {
    beforeAll(async(done) => {
        server = require('../../app');
        done();
    });

    afterEach(async() => {
        await User.deleteMany({});
    });

    afterAll(async(done) => {
        await server.close();
    });

    describe('GET /me', () => {
        const exec = async()=>{
            return await request(server)
                .get('/api/users/me')
                .set('x-auth-token', token)
                .send()
        }

        it('Should return the user', async () => {
            const user = new User({
                name: 'test name',
                email: 'test@gmail.com',
                password: '123456'
            });
            await user.save();
            token = user.generateAuthToken();

            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
            expect(res.body.result.name).toBe(user.name);
            expect(res.body.result.email).toBe(user.email);
            expect(res.body.result.password).toBeFalsy();
        });

        it('Should not found if the user not exist anymore', async () => {
            const user = new User({
                name: 'test name',
                email: 'test@gmail.com',
                password: '123456'
            });
            await user.save();
            token = user.generateAuthToken();

            await user.remove();

            const res = await exec();

            expect(res.status).toBe(404);
            expect(res.body.error).toBeTruthy();
        });
    });

    describe('POST /', () => {
        const exec = async(user)=>{
            return await request(server)
                .post('/api/users')
                .send(user);
        }

        it('Should create a user', async () => {
            const user = {
                name: 'test name',
                email: 'test@gmail.com',
                password: '123456'
            }

            const res = await exec(user);

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
            expect(res.body.result.name).toBe(user.name);
            expect(res.body.result.email).toBe(user.email);
            expect(res.body.result.password).toBeFalsy();
        });

        it('Should error if user already registered', async () => {
            const user = new User({
                name: 'test name',
                email: 'test@gmail.com',
                password: '123456'
            });
            await user.save();

            const newUser = {
                name: 'test name',
                email: 'test@gmail.com',
                password: '1234567'
            }

            const res = await exec(newUser);

            expect(res.status).toBe(400);
            expect(res.body.error).toBeTruthy();
        });

    });
});