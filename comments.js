// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const { randomBytes } = require('crypto');

const app = express();
const port = 4001;

// Use middleware
app.use(bodyParser.json());
app.use(cors());

// Save comments
const commentsByPostId = {};

// Get comments by post id
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create comments
app.post('/posts/:id/comments', async (req, res) => {
  const commentId = randomBytes(4).toString('hex');
  const { content } = req.body;

  // Get comments
  const comments = commentsByPostId[req.params.id] || [];
  comments.push({ id: commentId, content, status: 'pending' });

  // Save comments
  commentsByPostId[req.params.id] = comments;

  // Emit event
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending',
    },
  });

  res.status(201).send(comments);
});

// Receive event
app.post('/events', async (req, res) => {
  console.log('Event received:', req.body.type);

  const { type, data } = req.body;

  // Check event type
  if (type === 'CommentModerated') {
    // Get comments
    const comments = commentsByPostId[data.postId];

    // Get comment
    const comment = comments.find((comment) => comment.id === data.id);

    // Update comment status
    comment.status = data.status;

    // Emit event
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        ...comment,
        postId: data.postId,
      },
    });
  }

  res.send({});
});

// Listen port
app.listen(port, () => {
  console.log(`Comments listening on port ${port}`);
});