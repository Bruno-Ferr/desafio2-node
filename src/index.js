const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  //Receber username pelo header
  const { username }= request.headers;

  // Verificar se existe usuário ou não 
  const user = users.find(user => user.username === username)

  if (!!user === true) {
    // Se existir passar usuário pelo request
    request.user = user
  
    return next()
  } else {
    return response.status(404).json({
      error: 'Usuário não existe'
    })
  }
}

function checksCreateTodosUserAvailability(request, response, next) {
  // Recebe o usuário
  const user = request.user

  // Se - de 10 todos ou plano pro chama next()
  if (user.todos.length < 10 || user.pro === true) {
    next()
  } else {
    return response.status(403).json({error: 'Você precisa ser pro para escrever mais todos'})
  }
}

function checksTodoExists(request, response, next) {
  // Recebe username, header
  const { username } = request.headers
  // id, parâmetros
  const { id } = request.params
  const regex = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i

  // Validar usuário
  const user = users.find(user => user.username === username)

  if (!!user) {
    // Validar que id seja uuid e que pertença a um todo do usuário informado
    const todo = user.todos.find(todo => todo.id === id)
    if (regex.test(id) === true) {
      if (!!todo === true){
        // Repassar todo e usuário
        request.todo = todo
        request.user = user
  
        return next()
      } else {
        return response.status(404).json({error: 'Todo não existe'})
      }
    } else {
      return response.status(400).json({error: 'Id não é uuid'})
    }
  } else {
    return response.status(404).json({error: 'Usuário não existe'})
  }
  
}

function findUserById(request, response, next) {
  // id, parâmetro
  const { id } = request.params

  // Buscar usuário 
  const user = users.find(user => user.id === id)

  if (!!user === true) {
    // Repassar usuário
    request.user = user

    return next()
  } else {
    return response.status(404).json({
      error: 'Usuário não existe'
    })
  }
}

app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};