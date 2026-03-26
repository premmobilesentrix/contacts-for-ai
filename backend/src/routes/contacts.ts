import { Router } from "express";
import { query } from "../db";
import type { Contact } from "../types";

const router = Router();

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isPlausibleEmail(v: string): boolean {
  // Lightweight check; not RFC-complete.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

router.get("/", async (_req, res, next) => {
  try {
    const result = await query<{
      id: number;
      name: string;
      email: string;
      created_at: Date;
    }>("SELECT id, name, email, created_at FROM contacts ORDER BY id DESC");

    const contacts: Contact[] = result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      createdAt: r.created_at.toISOString(),
    }));

    res.json({ contacts });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, email } = req.body ?? {};

    if (!isNonEmptyString(name)) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!isNonEmptyString(email)) {
      return res.status(400).json({ error: "email is required" });
    }
    if (!isPlausibleEmail(email)) {
      return res.status(400).json({ error: "email is invalid" });
    }

    const result = await query<{
      id: number;
      name: string;
      email: string;
      created_at: Date;
    }>(
      "INSERT INTO contacts (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at",
      [name.trim(), email.trim().toLowerCase()],
    );

    const r = result.rows[0];
    const contact: Contact = {
      id: r.id,
      name: r.name,
      email: r.email,
      createdAt: r.created_at.toISOString(),
    };

    res.status(201).json({ contact });
  } catch (err: unknown) {
    // 23505 = unique_violation
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      return res.status(409).json({ error: "email already exists" });
    }
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "id must be a positive number" });
    }

    const result = await query<{ id: number }>(
      "DELETE FROM contacts WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "contact not found" });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;

