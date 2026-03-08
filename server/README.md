# Edu App Backend

A two-person edu application backend built with Node.js, Express, TypeScript, MongoDB, and Socket.io.

## Features

- REST API for user management and chat operations
- WebSocket support for real-time messaging
- Invite-based chat system (similar to Instagram DM requests)
- Clean layered architecture following SOLID principles

## Project Structure

```
server/
├── src/
│   ├── server.ts              # Entry point
│   ├── config/
│   │   └── db.ts              # MongoDB connection
│   ├── models/                # Mongoose schemas
│   │   ├── User.ts
│   │   ├── Chat.ts
│   │   └── Message.ts
│   ├── types/                   # TypeScript interfaces
│   │   ├── index.ts
│   │   └── socket.types.ts
│   ├── routes/                # API routes
│   │   ├── index.ts
│   │   ├── user.routes.ts
│   │   └── chat.routes.ts
│   ├── controllers/           # Request handlers
│   │   ├── user.controller.ts
│   │   └── chat.controller.ts
│   ├── services/              # Business logic
│   │   ├── user.service.ts
│   │   └── chat.service.ts
│   ├── websocket/             # WebSocket handlers
│   │   ├── socket.handler.ts
│   │   └── message.handler.ts
│   └── middleware/            # Middleware
│       └── validation.ts
├── package.json
├── tsconfig.json
└── .env.example
```

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `server` directory:
```bash
cp .env.example .env
```

4. Update the `.env` file with your MongoDB connection string:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/edu-app
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### User Endpoints

#### Create User
```http
POST /api/users
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com"  // optional
}
```

### Chat Endpoints

#### Create Chat Request
```http
POST /api/chat/request
Content-Type: application/json

{
  "fromUserId": "user_id_1",
  "toUserId": "user_id_2"
}
```

#### Accept Chat Request
```http
POST /api/chat/:chatId/accept
Content-Type: application/json

{
  "userId": "user_id_2"
}
```

#### Get User Chats
```http
GET /api/chat/user/:userId
```

#### Get Chat Messages
```http
GET /api/chat/:chatId/messages?page=1&limit=50
```

## WebSocket Events

### Client → Server

#### Connect User
```javascript
socket.emit('USER_CONNECT', { userId: 'user_id' });
```

#### Send Message
```javascript
socket.emit('MESSAGE_SEND', {
  chatId: 'chat_id',
  content: 'Hello!',
  senderId: 'user_id'
});
```

### Server → Client

#### Message Received
```javascript
socket.on('MESSAGE_RECEIVED', (data) => {
  console.log('New message:', data.message);
  console.log('Chat ID:', data.chatId);
});
```

#### Chat Request
```javascript
socket.on('CHAT_REQUEST', (data) => {
  console.log('New chat request:', data.chat);
});
```

#### Chat Accepted
```javascript
socket.on('CHAT_ACCEPTED', (data) => {
  console.log('Chat accepted:', data.chat);
});
```

#### Error
```javascript
socket.on('ERROR', (data) => {
  console.error('Error:', data.error);
});
```

## Architecture

The backend follows a clean layered architecture:

- **Routes**: Define API endpoints and map them to controllers
- **Controllers**: Handle HTTP request/response logic
- **Services**: Contain business logic and database operations
- **Models**: Define MongoDB schemas with Mongoose
- **WebSocket**: Handle real-time messaging events

## Error Handling

All errors are handled centrally and return a consistent format:
```json
{
  "error": "Error message",
  "statusCode": 400
}
```

## Development

### Type Checking
```bash
npm run type-check
```

### Building
```bash
npm run build
```

## License

ISC
