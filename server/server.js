const mongoose = require("mongoose");
const Document = require("./Document");

mongoose.connect("mongodb://localhost/docs-editor", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

const io = require('socket.io')(3001, {
  cors: {
    origin: 'http://localhost:3000',
    method: ['GET', 'POST']
  }
});

const defaultValue = "";

// when ever there is a new connection, this function is run
io.on("connection", socket => {
  socket.on('get-document', async documentId => {
    const document = await findOrCreateDocument(documentId);

    // this creates or assigns a client to publication room
    socket.join(documentId);
    socket.emit('load-document', document.data);

    // publish event to clients assign to the document room
    socket.on("send-changes", delta => {
      socket.broadcast.to(documentId).emit("received-changes", delta);
    });

    socket.on("save-document", async data => {
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });
});

async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, data: defaultValue });
}