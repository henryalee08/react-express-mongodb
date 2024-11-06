const express = require("express");
const serverResponses = require("../utils/helpers/responses");
const messages = require("../config/messages");
const { Todo } = require("../models/todos/todo");
const mongoose = require("mongoose");

const v2Routes = (app) => {
  const router = express.Router();

  // Helper function to validate ObjectIDs
  const isValidObjectId = (id) => {
    try {
      const objectId = new mongoose.Types.ObjectId(id);
      // Pre-Mongoose 7.x pattern for checking ObjectID type
      return objectId._bsontype === 'ObjectID';
    } catch (e) {
      return false;
    }
  };

  router.post("/todos", (req, res) => {
    const { text, parentId } = req.body;
    
    // Validate parentId if provided
    if (parentId && !Todo.validateObjectId(parentId)) {
        return serverResponses.sendError(
            res,
            { ...messages.BAD_REQUEST, message: 'Invalid parent todo ID' }
        );
    }

    const todo = new Todo({
        text,
        parentId: parentId || null
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
    const { ids } = req.body;

    // Validate all IDs are valid ObjectIDs
    const invalidIds = ids.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return serverResponses.sendError(
        res, 
        { ...messages.BAD_REQUEST, message: `Invalid ObjectIDs: ${invalidIds.join(', ')}` }
      );
    }

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

  // Add this route after line 92
  router.get("/todos/search", (req, res) => {
    // Even if query contains fields not in schema, they will be stripped
    // due to strictQuery: true
    const searchCriteria = req.query;
    
    Todo.find(searchCriteria)
        .then((todos) => {
            serverResponses.sendSuccess(res, messages.SUCCESSFUL, todos);
        })
        .catch((e) => {
            serverResponses.sendError(res, messages.BAD_REQUEST, e);
        });
  });

  // Add this route after the search route
  router.get("/todos/filter", (req, res) => {
    // Create a filtered query object with only valid schema fields
    const validFields = ['text', 'completed', 'priority'];
    const filterCriteria = {};
    
    validFields.forEach(field => {
        if (req.query[field] !== undefined) {
            filterCriteria[field] = req.query[field];
        }
    });

    // Due to strictQuery: true, any additional fields in the query
    // will be automatically stripped
    Todo.find(filterCriteria)
        .then((todos) => {
            serverResponses.sendSuccess(res, messages.SUCCESSFUL, todos);
        })
        .catch((e) => {
            serverResponses.sendError(res, messages.BAD_REQUEST, e);
        });
  });

  // Route to get a specific todo by ID
  router.get("/todos/:id", (req, res) => {
    const id = req.params.id;

    // Check if the provided ID is a valid ObjectId
    const oid = new mongoose.Types.ObjectId(id); // Create a new ObjectId instance

    // Using the pre-Mongoose 7.x pattern to check the _bsontype property
    if (oid._bsontype === 'ObjectID') { // Check if the _bsontype is 'ObjectID'
      // Proceed to find the todo by ID
      Todo.findById(id)
        .then((todo) => {
          if (!todo) {
            return serverResponses.sendError(res, messages.NOT_FOUND, "Todo not found");
          }
          serverResponses.sendSuccess(res, messages.SUCCESSFUL, todo);
        })
        .catch((e) => {
          serverResponses.sendError(res, messages.BAD_REQUEST, e);
        });
    } else {
      // If the ID is not a valid ObjectId, send an error response
      serverResponses.sendError(res, messages.BAD_REQUEST, "Invalid ID format");
    }
  });

  app.use("/api-v2", router);
};

module.exports = v2Routes;
