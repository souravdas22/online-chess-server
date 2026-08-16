# Real-Time Chess Server ♟️

> Real-time multiplayer chess backend built with Node.js, Fastify, Socket.IO and chess.js.

This repository contains the backend server for a real-time multiplayer chess application.

The server is responsible for managing chess games, validating moves, maintaining game state and synchronizing gameplay between connected clients through WebSockets.

The frontend client is maintained separately.

---

## ✨ Features

- ♟️ Real-time multiplayer chess
- ⚡ WebSocket-based communication
- 🎮 Game/session management
- ✅ Server-side chess move validation
- 🔄 Real-time move synchronization
- 👥 Multiple concurrent game sessions
- 🧩 Typed backend architecture
- 🚀 Fastify-based HTTP server

---

## 🏗️ Architecture

```text
                    Chess Client
                         │
                         │ WebSocket
                         ▼
              ┌─────────────────────┐
              │    Fastify Server   │
              └──────────┬──────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ Socket.IO     │
                 │ Event Layer   │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ Game Manager  │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │   chess.js    │
                 │ Move Validation│
                 └───────────────┘
```

---

## 🔄 Game Flow

A typical move follows this flow:

```text
Player A
   │
   │ makeMove()
   ▼
Socket.IO
   │
   ▼
Game Manager
   │
   ▼
chess.js
   │
   ├── Invalid → Reject move
   │
   └── Valid
         │
         ▼
    Update Game State
         │
         ▼
   Broadcast Move
         │
      ┌──┴──┐
      ▼     ▼
 Player A  Player B
```

Chess moves are validated on the server rather than relying only on the client.

---

## 🛠️ Tech Stack

### Backend

- Node.js
- TypeScript
- Fastify
- Socket.IO
- chess.js

### Development

- tsx
- TypeScript
- npm

---

## 📂 Project Structure

```text
realtime-chess-server/
│
├── src/
│   ├── gameManager.ts
│   ├── server.ts
│   ├── socket.ts
│   └── types.ts
│
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm

### Clone

```bash
git clone https://github.com/souravdas22/realtime-chess-server.git

cd realtime-chess-server
```

### Install dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Start

```bash
npm start
```

---

## 🔌 Real-Time Communication

The server uses Socket.IO for real-time communication between connected chess clients.

The WebSocket layer handles events such as:

```text
connect
join_game
make_move
game_state
opponent_move
leave_game
disconnect
```

The exact event names depend on the current implementation.

---

## ♟️ Server-Side Game Management

Game state is managed on the server through the game manager.

A game session contains information such as:

```text
Game
 ├── Game ID
 ├── Player 1
 ├── Player 2
 ├── Current turn
 ├── Board state
 └── Game status
```

The server controls the authoritative state of the game.

---

## 🛡️ Server-Side Validation

Client applications should never be treated as the source of truth for game state.

The backend validates moves using `chess.js` before broadcasting them to the other player.

This prevents clients from simply sending arbitrary board states to the server.

---

## ⚡ Why WebSockets?

Traditional HTTP communication would require the client to repeatedly request the latest game state.

WebSockets allow the server to push events immediately:

```text
Player A moves
      │
      ▼
Server receives move
      │
      ▼
Move validated
      │
      ▼
Game state updated
      │
      ▼
Server emits event
      │
      ▼
Player B receives move
```

This provides the low-latency communication required for real-time multiplayer gameplay.

---

## 🧠 Backend Concepts Demonstrated

This project explores:

- WebSocket communication
- Real-time event handling
- Server-authoritative state
- Concurrent game sessions
- Event-driven communication
- Game state management
- Server-side validation
- TypeScript backend architecture
- Connection lifecycle management

---

## 🔮 Future Improvements

Potential improvements include:

- [ ] Player authentication
- [ ] Persistent game history
- [ ] Redis-backed game state
- [ ] Horizontal server scaling
- [ ] Socket.IO Redis adapter
- [ ] Reconnection support
- [ ] Spectator mode
- [ ] Matchmaking
- [ ] ELO/rating system
- [ ] Game timers
- [ ] Move history persistence
- [ ] Docker support
- [ ] Automated tests
- [ ] CI/CD

---

## 🔗 Frontend

The frontend client is maintained separately:

**Online Chess Client**

https://github.com/souravdas22/online-chess-client

---

## 📌 Project Status

🚧 **Active Development**

This project is primarily focused on exploring real-time backend communication and multiplayer game-server architecture.

---

## 👨‍💻 Author

**Sourav Das**

Backend Developer focused on Node.js and backend engineering.

GitHub:  
https://github.com/souravdas22

LinkedIn:  
https://www.linkedin.com/in/sourav-das-201596215/
