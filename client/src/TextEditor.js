import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { io } from 'socket.io-client';

const SAVE_INTERVAL_MS = 2000;
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
]

export function TextEditor() {
  const { id: documentId } = useParams();
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();

  useEffect(() => {
    const s = io("http://localhost:3001");
    setSocket(s);

    return () => {
      s.disconnect();
    }
  }, []);

  // this runs the document starts up
  useEffect(() => {
    if (socket == null || quill == null) return;

    // this gets the document data from the back-end
      // then sets the document data and makes it available for editting
    socket.once("load-document", document => {
      quill.setContents(document);
      quill.enable();
    });

    // this attaches the current document to a room to publish and listen to updates
      // from the server, the socket will emit load-document to the current document room
    socket.emit('get-document', documentId);
  }, [socket, quill, documentId]);

  // auto save the document
  useEffect(() => {
    if (socket == null || quill == null) return;

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [socket, quill]);

  // this updates the document when there is a change from another client 
  useEffect(() => {
    if (socket == null || quill == null) return;
    
    const handler = (delta) => {
      quill.updateContents(delta);
    };

    socket.on('received-changes', handler);

    return () => {
      socket.off('received-changes', handler);
    }
  }, [socket, quill]);

  // this runs whnen there is a change in document
  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = (delta, oldDelta, source) => {
      // prevent changes from with the application -- changes should always be from a user
      if (source !== 'user') return;
      socket.emit('send-changes', delta);
    };

    quill.on('text-change', handler);

    return () => {
      quill.off('text-change', handler);
    }
  }, [socket, quill]);

  const wrapperRef = useCallback((wrapper) => {
    if(wrapper == null) return;

    wrapper.innerHTML = "";
    const editor = document.createElement('div');
    wrapper.append(editor);
    const q = new Quill(
      editor, 
      { 
        theme: "snow", 
        modules: { toolbar: TOOLBAR_OPTIONS } 
      }
    );
    q.disable();
    q.setText('Loading...');
    setQuill(q);
  }, []);

  return <div className="container" ref={wrapperRef}></div>
}
