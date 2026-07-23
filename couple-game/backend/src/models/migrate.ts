import { query, getClient } from './db';

export async function runMigrations() {
  const client = await getClient();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY,
        game VARCHAR(50) NOT NULL DEFAULT 'tic-tac-toe',
        host_phone VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'WAITING'
          CHECK (status IN ('WAITING', 'PLAYING', 'FINISHED', 'EXPIRED')),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    console.log('Migrations complete');
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}