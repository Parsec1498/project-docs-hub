const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { ApolloServer, gql } = require('apollo-server-express');
const { nanoid } = require('nanoid');

const { LowSync } = require('lowdb');
const { JSONFileSync } = require('lowdb/node');

// --- DB (lowdb) ---
// IMPORTANT: keep DB file outside of the git-tracked source tree so that
// `git pull` or deploys do not wipe runtime data (pages, users, etc.).
// You can override the location with the DB_FILE env variable.
const defaultDataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(defaultDataDir)) {
  fs.mkdirSync(defaultDataDir, { recursive: true });
}
const dbFile = process.env.DB_FILE || path.join(defaultDataDir, 'db.json');
const adapter = new JSONFileSync(dbFile);
const db = new LowSync(adapter, { users: [], pages: [] });

db.read();
db.data ||= { users: [], pages: [] };

// Seed default admin if DB empty
if (db.data.users.length === 0) {
  const now = new Date().toISOString();
  db.data.users.push({
    id: nanoid(),
    username: 'admin',
    password: 'admin', // demo only
    role: 'ADMIN',
    email: 'admin@example.com',
    createdAt: now,
    updatedAt: now,
  });
  db.write();
} else {
  db.write();
}

// In-memory sessions: token -> userId
const sessions = new Map();

function safeUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

function getTokenFromReq(req) {
  const h = req.headers.authorization || '';
  return h.replace(/^Bearer\s+/i, '').trim();
}

function getUserByToken(token) {
  if (!token) return null;
  const userId = sessions.get(token);
  if (!userId) return null;
  return db.data.users.find((u) => u.id === userId) || null;
}

function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9�-�����\-_\s]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function requireAuth(ctx) {
  if (!ctx.user) throw new Error('Not authenticated');
  return ctx.user;
}

function requireEditor(ctx) {
  const u = requireAuth(ctx);
  if (!['EDITOR', 'ADMIN'].includes(u.role)) throw new Error('Forbidden');
  return u;
}

function deletePageRecursive(pageId) {
  const children = db.data.pages.filter((p) => p.parentId === pageId);
  for (const c of children) deletePageRecursive(c.id);
  db.data.pages = db.data.pages.filter((p) => p.id !== pageId);
}

// --- GraphQL ---
const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    role: String!
    email: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Page {
    id: ID!
    parentId: ID
    title: String!
    slug: String!
    type: String!
    content: String!
    createdAt: String!
    updatedAt: String!
    updatedBy: User
    children: [Page!]!
  }

  input PageCreateInput {
    parentId: ID
    title: String!
    slug: String
    type: String
    content: String
  }

  input PageUpdateInput {
    parentId: ID
    title: String
    slug: String
    type: String
    content: String
  }

  type Query {
    me: User
    pages(parentId: ID): [Page!]!
    page(id: ID!): Page
    searchPages(q: String!): [Page!]!
  }

  type Mutation {
    login(username: String!, password: String!): AuthPayload!
    logout: Boolean!
    createPage(input: PageCreateInput!): Page!
    updatePage(id: ID!, input: PageUpdateInput!): Page!
    deletePage(id: ID!): Boolean!
  }
`;

const resolvers = {
  Page: {
    children: (page) => db.data.pages.filter((p) => p.parentId === page.id),
    updatedBy: (page) => {
      if (!page.updatedBy) return null;
      return safeUser(db.data.users.find((u) => u.id === page.updatedBy) || null);
    },
  },
  Query: {
    me: (_, __, ctx) => safeUser(ctx.user),
    pages: (_, { parentId }) => {
      if (parentId === undefined || parentId === null) {
        return db.data.pages.filter((p) => p.parentId === null);
      }
      return db.data.pages.filter((p) => p.parentId === parentId);
    },
    page: (_, { id }) => db.data.pages.find((p) => p.id === id) || null,
    searchPages: (_, { q }) => {
      const s = String(q || '').toLowerCase().trim();
      if (!s) return [];
      return db.data.pages.filter((p) => {
        return (
          p.title.toLowerCase().includes(s) ||
          p.slug.toLowerCase().includes(s) ||
          (p.content || '').toLowerCase().includes(s)
        );
      });
    },
  },
  Mutation: {
    login: (_, { username, password }) => {
      const uName = String(username || '').trim();
      const pass = String(password || '').trim();
      if (!uName || !pass) throw new Error('username/password required');

      let user = db.data.users.find((u) => u.username === uName);

      // demo behavior: auto-create editor on first login
      if (!user) {
        const now = new Date().toISOString();
        user = {
          id: nanoid(),
          username: uName,
          password: pass,
          role: 'EDITOR',
          email: null,
          createdAt: now,
          updatedAt: now,
        };
        db.data.users.push(user);
        db.write();
      }

      if (user.password !== pass) throw new Error('Invalid credentials');

      const token = nanoid(32);
      sessions.set(token, user.id);

      return { token, user: safeUser(user) };
    },

    logout: (_, __, ctx) => {
      if (ctx.token) sessions.delete(ctx.token);
      return true;
    },

    createPage: (_, { input }, ctx) => {
      const u = requireEditor(ctx);
      const now = new Date().toISOString();

      const title = input.title;
      const type = input.type || 'DOC';
      const content = input.content || '';
      const parentId = input.parentId ?? null;

      const slug = input.slug ? slugify(input.slug) : slugify(title) || nanoid(6);

      const page = {
        id: nanoid(),
        parentId,
        title,
        slug,
        type,
        content,
        createdAt: now,
        updatedAt: now,
        updatedBy: u.id,
      };

      db.data.pages.push(page);
      db.write();
      return page;
    },

    updatePage: (_, { id, input }, ctx) => {
      const u = requireEditor(ctx);
      const page = db.data.pages.find((p) => p.id === id);
      if (!page) throw new Error('Page not found');

      if (input.parentId !== undefined) page.parentId = input.parentId ?? null;
      if (input.title !== undefined) page.title = input.title;
      if (input.slug !== undefined) page.slug = slugify(input.slug) || page.slug;
      if (input.type !== undefined) page.type = input.type;
      if (input.content !== undefined) page.content = input.content;

      page.updatedAt = new Date().toISOString();
      page.updatedBy = u.id;

      db.write();
      return page;
    },

    deletePage: (_, { id }, ctx) => {
      requireEditor(ctx);
      const exists = db.data.pages.some((p) => p.id === id);
      if (!exists) return false;

      deletePageRecursive(id);
      db.write();
      return true;
    },
  },
};

async function start() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      const token = getTokenFromReq(req);
      const user = getUserByToken(token);
      return { token, user, req };
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql', cors: false });

  const PORT = Number(process.env.PORT || 4000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend: http://0.0.0.0:${PORT}${server.graphqlPath}`);
    console.log(`Seed user: admin / admin`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
