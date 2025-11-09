# Chat Server

A simple chat server where multiple users can connect and talk to each other.


Start the server:
```
node chat-server.js
```

Connect clients (open new terminals):
```
node simple-client.js
```

## Commands

Login first:
```
LOGIN yourname
```

Send message:
```
MSG hello everyone
```

See who's online:
```
WHO
```

Private message:
```
DM username Hi!
```

Check connection:
```
PING
```



Open 2-3 terminals, run the client in each, login with different names, and start chatting. Messages you send will show up in all other terminals.

Server runs on port 4000 by default.
