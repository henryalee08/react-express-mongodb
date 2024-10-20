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

  /*
   * Introducing the Model.update() concept:
   * Use Case: We want to implement a feature that allows users to mark multiple todos as completed at once. This can be done by sending an array of todo IDs to the server, which will then update the completed status of each todo.
   */
  // Add a new route to mark multiple todos as completed
  router.patch("/todos/complete", (req, res) => {
    const { ids } = req.body; // Expecting an array of todo IDs

    // Use Model.update() to mark todos as completed
    Todo.update(
      { _id: { $in: ids } }, // Filter to find todos with the given IDs
      { $set: { completed: true } }, // Update operation to set completed to true
      { multi: true } // Option to update multiple documents
    )
      .then((result) => {
        serverResponses.sendSuccess(res, messages.SUCCESSFUL_UPDATE, result);
      })
      .catch((e) => {
        serverResponses.sendError(res, messages.BAD_REQUEST, e);
      });
  });

  /*
   * Introducing the Query.prototype.update() concept:
   * Use Case: We want to implement a feature that allows users to update the text of all todos that match a certain condition (e.g., all todos that contain a specific keyword). This will allow for batch updates based on a query.
   */
  // Add a new route to update todos containing a specific keyword
  router.patch("/todos/update-text", (req, res) => {
    const { keyword, newText } = req.body; // Expecting a keyword and new text

    // Use Query.prototype.update() to update todos that match the keyword
    Todo.find({ text: { $regex: keyword, $options: 'i' } }) // Find todos containing the keyword
      .update({ $set: { text: newText } }) // Update operation to set new text
      .then((result) => {
        serverResponses.sendSuccess(res, messages.SUCCESSFUL_UPDATE, result);
      })
      .catch((e) => {
        serverResponses.sendError(res, messages.BAD_REQUEST, e);
      });
  });

  /*
   * Introducing the Document.prototype.update() concept:
   * Use Case: We want to allow users to edit a specific todo item. When a user clicks on a todo, they can edit its text, and we will use the update() method on the specific document instance to save the changes.
   */
  // Add a new route to edit a specific todo
  router.put("/todos/:id", (req, res) => {
    const id = req.params.id; // Get the todo ID from the request parameters
    const { text } = req.body; // Get the new text from the request body

    // Find the specific todo document
    Todo.findById(id)
      .then((todo) => {
        if (!todo) {
          return serverResponses.sendError(res, messages.NOT_FOUND, "Todo not found");
        }

        // Use Document.prototype.update() to update the todo's text
        todo.text = text; // Update the text field
        return todo.save(); // Save the updated document
      })
      .then((updatedTodo) => {
        serverResponses.sendSuccess(res, messages.SUCCESSFUL_UPDATE, updatedTodo);
      })
      .catch((e) => {
        serverResponses.sendError(res, messages.BAD_REQUEST, e);
      });
  });

  app.use("/api-v2", router);
};

module.exports = v2Routes;
