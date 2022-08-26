const pool = require('../lib/utils/pool');
const setup = require('../data/setup');
const request = require('supertest');
const app = require('../lib/app');

const mockUser = {
  email: 'hello@getshtdone.com',
  password: '123456',
  firstName: 'Karen',
  lastName: 'Jones',
};
const registerAndLogin = async (userProps = {}) => {
  const password = userProps.password ?? mockUser.password;

  const agent = request.agent(app);

  const resp = await agent
    .post('/api/v1/users')
    .send({ ...mockUser, ...userProps });
  const user = resp.body;
  return [agent, user];
};

describe('backend-express-template routes', () => {
  beforeEach(() => {
    return setup(pool);
  });

  it('POST - able to create new user', async () => {
    const res = await request(app).post('/api/v1/users').send(mockUser);
    const { email, firstName, lastName } = mockUser;
    expect(res.body).toEqual({
      id: expect.any(String),
      email,
      firstName,
      lastName,
    });
  });

  it('GET /me returns currently logged in user', async () => {
    const [agent, user] = await registerAndLogin();
    const res = await agent.get('/api/v1/users/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...user,
      exp: expect.any(Number),
      iat: expect.any(Number),
    });
  });

  it('GET /me should return a 401 if not logged in', async () => {
    const resp = await request(app).get('/api/v1/users/me');
    expect(resp.status).toBe(401);
  });

  it('DELETE /api/v1/users/sessions should logout a session', async () => {
    const [agent, user] = await registerAndLogin();
    const deleteUser = await agent.delete('/api/v1/users/sessions');
    expect(deleteUser.status).toBe(204);
    const res = await agent.get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/todos should return a list of tasks', async () => {
    const [agent] = await registerAndLogin();
    await agent.post('/api/v1/todos').send({
      task: 'Get some sleep',
      completed: false,
    });
    const res = await agent.get('/api/v1/todos');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual([
      {
        id: expect.any(String),
        task: 'Get some sleep',
        user_id: '2',
        completed: false,
      },
    ]);
  });

  it('POST /api/v1/todos should create task for authenticated user', async () => {
    const [agent, user] = await registerAndLogin();
    const res = await agent.post('/api/v1/todos').send({
      task: 'Get some sleep',
      completed: false,
      user_id: expect.any(String),
    });
    expect(res.status).toBe(200);
  });

  it('DELETE /api/v1/todos/:id should delete task', async () => {
    const [agent] = await registerAndLogin();
    const newTask = {
      task: 'Get some sleep',
      completed: false,
    };
    const taskRes = await agent.post('/api/v1/todos').send(newTask);
    console.log('taskRes', taskRes.body);
    await agent.delete(`/api/v1/todos/${taskRes.body.id}`);
    const res = await agent.get('/api/v1/todos');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual([]);
  });

  afterAll(() => {
    pool.end();
  });
});


