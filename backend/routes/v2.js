const express = require("express");
const serverResponses = require("../utils/helpers/responses");
const messages = require("../config/messages");
const { Todo } = require("../models/todos/todo");

const v2Routes = (app) => {
  const router = express.Router();

  router.post("/todos", (req, res) => {
    const todo = new Todo({
      text: req.body.text,
    });

    todo
      .save()
      .then((result) => {
        serverResponses.sendSuccess(res, messages.SUCCESSFUL, result);
      })
      .catch((e) => {
        serverResponses.sendError(res, messages.BAD_REQUEST, e);
      });
  });

  router.get("/", (req, res) => {
    Todo.find({}, { __v: 0 })
      .then((todos) => {
        serverResponses.sendSuccess(res, messages.SUCCESSFUL, todos);
      })
      .catch((e) => {
        serverResponses.sendError(res, messages.BAD_REQUEST, e);
      });
  });

  router.delete("/todos/:id", (req, res) => {
    const id = req.params.id;

    Todo.findById(id)
      .then((todo) => {
        if (!todo) {
          return serverResponses.sendError(res, messages.NOT_FOUND, "Todo not found");
        }
        
        return todo.remove();
      })
      .then((removedTodo) => {
        serverResponses.sendSuccess(res, messages.SUCCESSFUL_DELETE, removedTodo);
      })
      .catch((e) => {
        serverResponses.sendError(res, messages.BAD_REQUEST, e);
      });
  });

  app.use("/api-v2", router);
};

module.exports = v2Routes;
