import { Client as PgClient } from 'pg';
import mysql from 'mysql2/promise';

export interface DbConnectionConfig {
  dbType: 'POSTGRES' | 'MYSQL';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export interface BlogInsertPayload {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  imageAlt?: string;
  tags?: string;
  faqs?: string;
  articleSection?: string;
  structuredData?: string;
  wordCount?: number;
  readingTime?: number;
  author?: string;
  isFeatured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  canonicalUrl?: string;
  isPublished?: boolean;
  publishedAt?: string;
  [key: string]: unknown;
}

function genId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export async function testConnection(config: DbConnectionConfig): Promise<{ success: boolean; error?: string }> {
  try {
    if (config.dbType === 'POSTGRES') {
      const client = new PgClient({
        host: config.host, port: config.port, database: config.database,
        user: config.username, password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
      });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
    } else {
      const conn = await mysql.createConnection({
        host: config.host, port: config.port, database: config.database,
        user: config.username, password: config.password,
        ssl: config.ssl ? {} : undefined, connectTimeout: 5000,
      });
      await conn.query('SELECT 1');
      await conn.end();
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
}

// Links categories and industries to a blog row via join tables
async function linkBlogRelations(
  config: DbConnectionConfig,
  blogId: string,
  categoryNames: string[],
  industryNames: string[]
): Promise<void> {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  if (config.dbType === 'MYSQL') {
    const conn = await mysql.createConnection({
      host: config.host, port: config.port, database: config.database,
      user: config.username, password: config.password,
      ssl: config.ssl ? {} : undefined,
    });

    const findOrCreate = async (table: string, name: string): Promise<string> => {
      const [rows] = await conn.execute(`SELECT id FROM \`${table}\` WHERE name = ? AND isActive = 1 LIMIT 1`, [name]) as any[];
      if (rows.length > 0) return rows[0].id;
      const id = genId();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await conn.execute(
        `INSERT INTO \`${table}\` (id, name, slug, isActive, \`order\`, createdAt, updatedAt) VALUES (?, ?, ?, 1, 0, ?, ?)`,
        [id, name, slug, now, now]
      );
      return id;
    };

    for (const name of categoryNames.filter(Boolean)) {
      try {
        const categoryId = await findOrCreate('Category', name);
        const joinId = genId();
        await conn.execute(
          'INSERT IGNORE INTO `BlogCategory` (id, blogId, categoryId, createdAt) VALUES (?, ?, ?, ?)',
          [joinId, blogId, categoryId, now]
        );
      } catch (e) { console.error('[external-db] Category link error:', e); }
    }

    for (const name of industryNames.filter(Boolean)) {
      try {
        const industryId = await findOrCreate('Industry', name);
        const joinId = genId();
        await conn.execute(
          'INSERT IGNORE INTO `BlogIndustry` (id, blogId, industryId, createdAt) VALUES (?, ?, ?, ?)',
          [joinId, blogId, industryId, now]
        );
      } catch (e) { console.error('[external-db] Industry link error:', e); }
    }

    await conn.end();
  } else {
    // PostgreSQL
    const client = new PgClient({
      host: config.host, port: config.port, database: config.database,
      user: config.username, password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
    });
    await client.connect();

    const findOrCreate = async (table: string, name: string): Promise<string> => {
      const res = await client.query(`SELECT id FROM "${table}" WHERE name = $1 AND "isActive" = true LIMIT 1`, [name]);
      if (res.rows.length > 0) return res.rows[0].id;
      const id = genId();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await client.query(
        `INSERT INTO "${table}" (id, name, slug, "isActive", "order", "createdAt", "updatedAt") VALUES ($1,$2,$3,true,0,$4,$5)`,
        [id, name, slug, now, now]
      );
      return id;
    };

    for (const name of categoryNames.filter(Boolean)) {
      try {
        const categoryId = await findOrCreate('Category', name);
        const joinId = genId();
        await client.query(
          `INSERT INTO "BlogCategory" (id, "blogId", "categoryId", "createdAt") VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [joinId, blogId, categoryId, now]
        );
      } catch (e) { console.error('[external-db] Category link error:', e); }
    }

    for (const name of industryNames.filter(Boolean)) {
      try {
        const industryId = await findOrCreate('Industry', name);
        const joinId = genId();
        await client.query(
          `INSERT INTO "BlogIndustry" (id, "blogId", "industryId", "createdAt") VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [joinId, blogId, industryId, now]
        );
      } catch (e) { console.error('[external-db] Industry link error:', e); }
    }

    await client.end();
  }
}

export async function insertBlogRow(
  config: DbConnectionConfig,
  tableName: string,
  fieldMapping: Record<string, string>,
  payload: BlogInsertPayload,
  relations?: { categoryNames?: string[]; industryNames?: string[] }
): Promise<{ id: string | number }> {
  const defaultMapping: Record<string, string> = {
    title: 'title',
    slug: 'slug',
    content: 'content',
    excerpt: 'excerpt',
    featuredImage: 'featuredImage',
    imageAlt: 'imageAlt',
    tags: 'tags',
    faqs: 'faqs',
    articleSection: 'articleSection',
    structuredData: 'structuredData',
    wordCount: 'wordCount',
    readingTime: 'readingTime',
    author: 'author',
    isFeatured: 'isFeatured',
    seoTitle: 'seoTitle',
    seoDescription: 'seoDescription',
    seoKeywords: 'seoKeywords',
    canonicalUrl: 'canonicalUrl',
    isPublished: 'isPublished',
    publishedAt: 'publishedAt',
  };

  const mapping = { ...defaultMapping, ...fieldMapping };
  const columns: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  // Always generate id (Prisma @default(cuid()) is app-level, not DB-level)
  const blogId = genId();
  columns.push('id');
  values.push(blogId);

  for (const [ourKey, theirColumn] of Object.entries(mapping)) {
    if (payload[ourKey] !== undefined && payload[ourKey] !== null) {
      columns.push(theirColumn);
      values.push(payload[ourKey] as string | number | boolean);
    }
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (!columns.includes('createdAt')) { columns.push('createdAt'); values.push(now); }
  if (!columns.includes('updatedAt')) { columns.push('updatedAt'); values.push(now); }

  let insertedId: string | number = blogId;

  if (config.dbType === 'POSTGRES') {
    const client = new PgClient({
      host: config.host, port: config.port, database: config.database,
      user: config.username, password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
    });
    await client.connect();
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const quotedCols = columns.map(c => `"${c}"`).join(', ');
    const sql = `INSERT INTO "${tableName}" (${quotedCols}) VALUES (${placeholders}) RETURNING id`;
    const result = await client.query(sql, values);
    await client.end();
    insertedId = result.rows[0].id || blogId;
  } else {
    const conn = await mysql.createConnection({
      host: config.host, port: config.port, database: config.database,
      user: config.username, password: config.password,
      ssl: config.ssl ? {} : undefined,
    });
    const placeholders = columns.map(() => '?').join(', ');
    const backtickCols = columns.map(c => `\`${c}\``).join(', ');
    const sql = `INSERT INTO \`${tableName}\` (${backtickCols}) VALUES (${placeholders})`;
    const [result] = await conn.execute(sql, values as any[]);
    await conn.end();
    insertedId = (result as any).insertId || blogId;
  }

  // Link categories and industries if provided
  if (relations?.categoryNames?.length || relations?.industryNames?.length) {
    try {
      await linkBlogRelations(
        config,
        String(insertedId || blogId),
        relations.categoryNames || [],
        relations.industryNames || []
      );
    } catch (e) {
      console.error('[external-db] Relations linking failed (non-fatal):', e);
    }
  }

  return { id: insertedId };
}
