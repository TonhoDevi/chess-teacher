import { useEffect, useState } from 'react';
import { loadOpenings, type Db } from './db';

export function useOpeningDb(): Db | null {
  const [db, setDb] = useState<Db | null>(null);
  useEffect(() => {
    let alive = true;
    void loadOpenings().then((d) => alive && setDb(d));
    return () => {
      alive = false;
    };
  }, []);
  return db;
}
