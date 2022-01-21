const express = require("express");
const cors = require("cors");
const Pool = require("pg").Pool;
const { Client } = require("pg");
require("dotenv").config();
import { Request, Response } from "express";

const app = express();
const port = process.env.PORT || 8080;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const pool = new Pool({
  user: process.env.USER!,
  password: process.env.PASSWORD!,
  host: process.env.HOST!,
  port: process.env.PSQLPORT!,
  database: process.env.DATABASE!,
});

client.connect();
app.use(cors());
app.use(express.json());

// POST COMMANDS ------------------------------------------------------

// Add single user
app.post("/users", async (req: Request, res: Response) => {
  const { user_id, email, first_name, last_name, bio, avatar, location } =
    req.body;

  try {
    const newUser = await client.query(
      `
    INSERT INTO users(user_id,email,first_name,last_name,bio,avatar,location,date_joined) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,to_timestamp(${Date.now() / 1000}))
    RETURNING *
    `,
      [user_id, email, first_name, last_name, bio, avatar, location]
    );
    res.json(newUser.rows[0]);
  } catch (err: any) {
    res.json(err.detail);
  }
});

// Add a single post
app.post("/posts", async (req: Request, res: Response) => {
  const { user_id, post_type, title, description, url, tags } = req.body;

  try {
    const post = await pool.query(
      `
    INSERT INTO posts(user_id,post_type,title,description,url,tags,date_posted) 
    VALUES ($1,$2,$3,$4,$5,$6,to_timestamp(${Date.now() / 1000}))
    RETURNING *
    `,
      [user_id, post_type, title, description, url, tags]
    );
    res.json(post.rows[0]);
  } catch (err: any) {
    res.json(err.detail);
  }
});

//-------------------------------------------------------------

// Update commands ----------------------------------------------

// Update single user
app.put("/users/:user_id", async (req: Request, res: Response) => {
  const user_id = req.params.user_id;
  const { email, first_name, last_name, bio, avatar, location } = req.body;
  try {
    const user = await pool.query(
      `
      UPDATE users SET
        email = COALESCE($2,email), 
        first_name = COALESCE($3,first_name), 
        last_name = COALESCE($4,last_name), 
        bio = COALESCE($5,bio), 
        avatar = COALESCE($6,avatar), 
        location = COALESCE($7,location)
      WHERE user_id=($1)
      RETURNING *
      `,
      [user_id, email, first_name, last_name, bio, avatar, location]
    );
    res.json(user.rows[0]);
  } catch (err: any) {
    res.json(err.detail);
  }
});

// Update post(s)
app.put("/posts/:user_id/:post_number", async (req: Request, res: Response) => {
  const user_id = req.params.user_id;
  const post_number = req.params.post_number;
  const { post_type, title, description, url, tags } = req.body;
  try {
    const post = await pool.query(
      `
      UPDATE posts SET
        post_type = COALESCE($3,post_type), 
        title = COALESCE($4,title), 
        description = COALESCE($5,description), 
        url = COALESCE($6,url), 
        tags = COALESCE($7,tags) 
      WHERE user_id=($1) AND post_number=($2)
      RETURNING *;
      `,
      [user_id, post_number, post_type, title, description, url, tags]
    );
    res.json(post.rows);
  } catch (err: any) {
    res.json(err.detail);
  }
});

//----------------------------------------------------------

// GET COMMANDS ----------------------------------------------

// All users
app.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await client.query("SELECT * FROM users");
    res.json(users.rows);
  } catch (err: any) {
    res.json(err);
  }
  client.end()
});

// All posts
app.get("/posts", async (req: Request, res: Response) => {
  try {
    const posts = await pool.query(`SELECT * FROM posts`);
    res.json(posts.rows);
  } catch (err: any) {
    res.json(err);
  }
});

// Single User
app.get("/users/:user_id", async (req: Request, res: Response) => {
  const user_id = req.params.user_id;
  try {
    const user = await pool.query(`SELECT * FROM users WHERE (user_id)=($1)`, [
      user_id,
    ]);
    res.json(user.rows[0]);
  } catch (err: any) {
    res.json(err);
  }
});

// Posts for single user, with optional filter by type
app.get("/posts/:user_id/:filter", async (req: Request, res: Response) => {
  const user_id = req.params.user_id;
  const filter = req.params.filter;

  if (filter == "all") {
    try {
      const user = await pool.query(
        `
        SELECT * 
        FROM posts 
        WHERE (user_id)=($1)
        `,
        [user_id]
      );
      res.json(user.rows);
    } catch (err: any) {
      res.json(err);
    }
  } else {
    try {
      const user = await pool.query(
        `
        SELECT * 
        FROM posts 
        WHERE (user_id)=($1) AND post_type=($2)
        `,
        [user_id, filter]
      );
      res.json(user.rows);
    } catch (err: any) {
      res.json(err);
    }
  }
});

// Post for a single user, queried by post number of the user
app.get(
  "/posts/:user_id/post/:post_number",
  async (req: Request, res: Response) => {
    const user_id = req.params.user_id;
    const post_number = req.params.post_number;

    try {
      const post = await pool.query(
        `
      SELECT *
      FROM posts
      WHERE (user_id)=($1) AND post_number=($2)
      `,
        [user_id, post_number]
      );
      res.json(post.rows[0]);
    } catch (err: any) {
      res.json({ response: err });
    }
  }
);

// Delete Commands -------------------------------------------

// Delete a user (also deletes all of their posts)
app.delete("/users/:user_id", async (req: Request, res: Response) => {
  const user_id = req.params.user_id;
  try {
    await pool.query(
      `
      DELETE FROM posts
      WHERE (user_id)=($1);
      `,
      [user_id]
    );

    await pool.query(
      `
      DELETE FROM users
      WHERE (user_id)=($1)
      `,
      [user_id]
    );

    res.json({ response: "User has been deleted." });
  } catch (err: any) {
    res.json({ response: err });
  }
});

// Delete all posts of a user by type, or all of them.
app.delete("/posts/:user_id/:filter", async (req: Request, res: Response) => {
  const user_id = req.params.user_id;
  const filter = req.params.filter;

  if (filter == "all") {
    try {
      await pool.query(
        `
      DELETE FROM posts
      WHERE (user_id)=($1)
      `,
        [user_id]
      );

      res.json({ response: "All posts have been deleted." });
    } catch (err: any) {
      res.json({ response: err });
    }
  } else {
    try {
      await pool.query(
        `
      DELETE FROM posts
      WHERE (user_id)=($1) AND (post_type)=($2)
      `,
        [user_id, filter]
      );

      res.json({
        response: `Posts of category: "${filter}" have been deleted.`,
      });
    } catch (err: any) {
      res.json(err);
    }
  }
});

// Delete a single post of a user
app.delete(
  "/posts/:user_id/post/:post_number",
  async (req: Request, res: Response) => {
    const user_id = req.params.user_id;
    const post_number = req.params.post_number;
    try {
      await pool.query(
        `
      DELETE FROM posts
      WHERE (user_id)=($1) AND (post_number)=($2)
      `,
        [user_id, post_number]
      );

      res.json({ response: "Post has been deleted." });
    } catch (err: any) {
      res.json({ response: err });
    }
  }
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}.`);
});
